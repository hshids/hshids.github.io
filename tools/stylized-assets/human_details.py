"""Rounded, fully volumetric Hanjing head kit for the local stylized avatar.

No photographs, texture cards, facial height maps or white eye patches. The
portrait references inform the side-parted waves / evening updo and warm
palette; this deliberately simplified character is not a face scan.

Contract: Blender Z up, face toward -Y, source armature world matrix identity.
All output meshes are weighted to the supplied Head/Neck/Chest bones, with
continuous head/neck skin and closed solid hair masses. Body/clothes/clips are
owned by build_humans.py.
"""
from __future__ import annotations
import math
import bpy
import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def _linear(c):
    c=c/255.0
    return c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4


def _mat(name, colour, roughness, specular=.18):
    colour=colour.lstrip('#')
    rgb=tuple(_linear(int(colour[i:i+2],16)) for i in (0,2,4))
    m=bpy.data.materials.new(name);m.use_nodes=True;m.use_backface_culling=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*rgb,1)
    bs.inputs['Metallic'].default_value=0
    bs.inputs['Roughness'].default_value=roughness
    bs.inputs['Specular IOR Level'].default_value=specular
    bs.inputs['Emission Strength'].default_value=0
    return m


def _bone_names(arm):
    bones=list(arm.data.bones)
    result={}
    for name in ('Head','Neck','Chest'):
        found=next((b.name for b in bones if b.name.split(':')[-1]==name),None)
        if found is None:raise ValueError('Stylized head needs '+name+' bone')
        result[name]=found
    return result


def _smoothstep(lo,hi,z):
    t=max(0,min(1,(z-lo)/(hi-lo)))
    return t*t*(3-2*t)


def _skin_weights(v):
    neck_radius=math.sqrt((v.x/.056)**2+((v.y-NECK_CENTRE[1])/.049)**2)
    head=max(_smoothstep(1.560,1.615,v.z),_smoothstep(.90,1.40,neck_radius))
    chest=(1-head)*.35*(1-_smoothstep(1.498,1.535,v.z))
    return {'Head':head,'Neck':1-head-chest,'Chest':chest}


def _head_weights(v):return {'Head':1}


def _hair_weights(v):
    chest=.15*(1-_smoothstep(1.39,1.62,v.z))
    return {'Head':1-chest,'Chest':chest}


def _rig(ob,arm,names,weights):
    for old in list(ob.vertex_groups):ob.vertex_groups.remove(old)
    groups={n:ob.vertex_groups.new(name=names[n]) for n in ('Head','Neck','Chest')}
    for v in ob.data.vertices:
        values=weights(v.co);total=sum(values.values())
        if total<=0:raise ValueError('Unweighted stylized head vertex')
        for n,w in values.items():
            if w>0:groups[n].add([v.index],w/total,'REPLACE')
    mod=ob.modifiers.new('Preserved source character skeleton','ARMATURE');mod.object=arm
    ob.parent=arm
    # Source armature is identity: leave authored points in its local frame.
    ob.matrix_parent_inverse=arm.matrix_world.inverted()
    return ob


def _mesh(name,verts,faces,material):
    mesh=bpy.data.meshes.new(name+' geometry');mesh.from_pydata(verts,[],faces);mesh.update()
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    if all(len(e.link_faces)==2 for e in bm.edges) and bm.calc_volume(signed=True)<0:
        bmesh.ops.reverse_faces(bm,faces=list(bm.faces))
    bm.to_mesh(mesh);bm.free();mesh.update()
    ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob)
    mesh.materials.append(material)
    for p in mesh.polygons:p.use_smooth=True
    return ob


def _ellipsoid(name,centre,radii,mat,quality='high',rotation=None):
    segments=48 if quality=='high' else 32
    rings=24 if quality=='high' else 16
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=1)
    ob=bpy.context.object;ob.name=name
    transform=rotation.to_matrix() if rotation else None
    for v in ob.data.vertices:
        v.co=Vector((v.co.x*radii[0],v.co.y*radii[1],v.co.z*radii[2]))
        if transform:v.co=transform@v.co
        v.co+=Vector(centre)
    ob.data.materials.append(mat)
    for p in ob.data.polygons:p.use_smooth=True
    # A UV is unnecessary for solid PBR colour; no painted face can slip in.
    for layer in list(ob.data.uv_layers):ob.data.uv_layers.remove(layer)
    return ob


def _tube(name,anchors,radii,mat,quality='high',flatten=1):
    points=[Vector(p) for p in anchors]
    steps=64 if quality=='high' else 40
    radial=12 if quality=='high' else 8
    centres=[];sizes=[]
    for i in range(steps+1):
        t=i/steps*(len(points)-1);j=min(len(points)-2,int(t));u=t-j
        p0=points[max(0,j-1)];p1=points[j];p2=points[j+1];p3=points[min(len(points)-1,j+2)]
        c=.5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u*u*u)
        centres.append(c);sizes.append(radii[j]*(1-u)+radii[j+1]*u)
    verts=[];faces=[]
    for i,c in enumerate(centres):
        tangent=centres[min(i+1,steps)]-centres[max(0,i-1)]
        tangent.normalize()
        axis=Vector((0,-1,0))
        if abs(axis.dot(tangent))>.95:axis=Vector((1,0,0))
        side=tangent.cross(axis).normalized();depth=tangent.cross(side).normalized()
        for k in range(radial):
            a=math.tau*k/radial
            verts.append(c+side*(sizes[i]*math.cos(a))+depth*(sizes[i]*flatten*math.sin(a)))
    for i in range(steps):
        for k in range(radial):
            a=i*radial+k;b=i*radial+(k+1)%radial
            faces.append((a,b,b+radial,a+radial))
    for i in (0,steps):
        vi=len(verts);verts.append(centres[i]);off=i*radial
        for k in range(radial):faces.append((vi,off+k,off+(k+1)%radial))
    return _mesh(name,verts,faces,mat)


def _rounded_volume(ob,quality,voxel_high=.0022,voxel_low=.0033,
                    vertex_budget_high=6500,vertex_budget_low=3200):
    """Rebuild intersections as an actual smooth closed volume.

    Boolean-intersected sphere triangles otherwise produce a nose-base star
    even with smooth normals. This is real geometry smoothing, not albedo or
    light adjustment. Voxel scales stay below the macroforms in both tiers.
    """
    bpy.context.view_layer.objects.active=ob
    mod=ob.modifiers.new('Continuous rounded surface','REMESH')
    mod.mode='VOXEL';mod.voxel_size=voxel_high if quality=='high' else voxel_low
    mod.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    sm=ob.modifiers.new('Gentle connected volume smoothing','SMOOTH')
    sm.factor=.38;sm.iterations=4
    bpy.ops.object.modifier_apply(modifier=sm.name)
    # The fine remesh is an authoring intermediate, not a mobile payload.
    # Adaptive collapse retains the rounded silhouette without exporting the
    # hundreds of thousands of almost coplanar voxel faces.
    budget=vertex_budget_high if quality=='high' else vertex_budget_low
    if len(ob.data.vertices)>budget:
        dec=ob.modifiers.new('Adaptive rounded volume budget','DECIMATE')
        dec.decimate_type='COLLAPSE';dec.ratio=budget/len(ob.data.vertices)
        dec.use_collapse_triangulate=True
        bpy.ops.object.modifier_apply(modifier=dec.name)
    for poly in ob.data.polygons:poly.use_smooth=True
    return ob


def _rear_hair_mass(mat,quality):
    """Short thick waves curl close to the rear skull and nape."""
    radial=64 if quality=='high' else 40
    rows=[
        (1.885,.019,.027,.015),
        (1.840,.074,.067,.043),
        (1.780,.127,.118,.052),
        (1.715,.154,.134,.046),
        (1.655,.158,.115,.048),
        (1.605,.151,.094,.044),
        (1.565,.140,.081,.039),
        (1.533,.128,.088,.031),
        (1.515,.103,.090,.020),
        (1.506,.062,.088,.006),
    ]
    # A coarse linear loft leaves visible hard bends on the profile. Sample
    # the same macro rows as one rounded Catmull-Rom volume before unification.
    controls=[Vector(row) for row in rows]
    steps=54 if quality=='high' else 36
    rows=[]
    for i in range(steps+1):
        t=i/steps*(len(controls)-1);j=min(len(controls)-2,int(t));u=t-j
        p0=controls[max(0,j-1)];p1=controls[j];p2=controls[j+1];p3=controls[min(len(controls)-1,j+2)]
        rows.append(tuple(.5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u*u*u)))
    verts=[];faces=[]
    for z,rx,cy,ry in rows:
        for j in range(radial):
            theta=math.tau*j/radial
            wave=.008*math.sin(4*theta+7*(z-1.506))*max(0,math.sin(theta))
            ends=.006*math.cos(3*theta+.3)*(1-_smoothstep(1.510,1.560,z))
            verts.append((rx*math.cos(theta),cy+ry*math.sin(theta)+wave,z+ends))
    for i in range(len(rows)-1):
        for j in range(radial):
            a=i*radial+j;b=i*radial+(j+1)%radial
            faces.append((a,b,b+radial,a+radial))
    for i in (0,len(rows)-1):
        z,rx,cy,ry=rows[i];p=len(verts);verts.append((0,cy,z))
        for j in range(radial):faces.append((p,i*radial+j,i*radial+(j+1)%radial))
    return _mesh('Hanjing stylized / continuous broad rear waves',verts,faces,mat)


def _unified_hair(parts,mats,quality,night):
    # Preserve the two already approved solid hair colours while closing all
    # lock roots into the cap. A nearest original surface assigns a whole-face
    # material; there is no photo texture or projected UV in this operation.
    vertices=[];faces=[];indices=[]
    for ob in parts:
        off=len(vertices);vertices.extend(v.co.copy() for v in ob.data.vertices)
        for p in ob.data.polygons:
            faces.append(tuple(off+i for i in p.vertices))
            indices.append(1 if ob.data.materials[p.material_index]==mats['hair_soft'] else 0)
    source=BVHTree.FromPolygons(vertices,faces,all_triangles=False)
    ob=_mesh('Hanjing stylized / one rounded evening hair volume' if night else
        'Hanjing stylized / one rounded flowing hair volume',vertices,faces,mats['hair'])
    ob.data.materials.append(mats['hair_soft'])
    for p,index in zip(ob.data.polygons,indices):p.material_index=index
    for old in parts:bpy.data.objects.remove(old,do_unlink=True)
    _rounded_volume(ob,quality,.0028,.0040,12500,6000)
    # Decimate can collapse a tiny disconnected cavity to two opposed copies
    # of one triangle. BMesh regards that zero-volume island as manifold,
    # while the glTF validator discards just one side and leaves a hole. Remove
    # the whole isolated island before skinning; never delete a main-shell face.
    duplicate_faces={};vertex_faces={}
    for p in ob.data.polygons:
        duplicate_faces.setdefault(tuple(sorted(p.vertices)),[]).append(p.index)
        for i in p.vertices:vertex_faces.setdefault(i,set()).add(p.index)
    collapsed_vertices=set();collapsed_islands=0
    for key,face_ids in duplicate_faces.items():
        if len(face_ids)<2:continue
        if (len(key)!=3 or len(face_ids)!=2 or
            set.union(*(vertex_faces[i] for i in key))!=set(face_ids)):
            raise ValueError('Hair reduction produced duplicate faces in a main volume')
        collapsed_vertices.update(key);collapsed_islands+=1
    if collapsed_vertices:
        bm=bmesh.new();bm.from_mesh(ob.data);bm.verts.ensure_lookup_table()
        bmesh.ops.delete(bm,geom=[bm.verts[i] for i in sorted(collapsed_vertices)],context='VERTS')
        bm.to_mesh(ob.data);bm.free();ob.data.update()
    ob['removed_collapsed_two_face_islands']=collapsed_islands
    for p in ob.data.polygons:
        nearest=source.find_nearest(p.center)
        if nearest[2] is not None:p.material_index=indices[nearest[2]]
    keys=[tuple(sorted(p.vertices)) for p in ob.data.polygons]
    if len(keys)!=len(set(keys)) or ob.data.validate(verbose=True):
        raise ValueError('Hair geometry would be changed by the glTF mesh validator')
    return ob


HEAD_CENTRE=Vector((0,.006,1.718))
HEAD_RADII=(.160,.139,.184)
EYE_X=.057
EYE_Z=1.727
EYE_RADII=(.0205,.0065,.0245)
NOSE_Z=1.688
EAR_X=.156
EAR_Z=1.718
NECK_CENTRE=(0,.016,1.550)


def _cute_hair_point(p):
    """Keep the established chest-length waves around the larger clay head."""
    x,y,z=p
    if z>=1.594:
        z=1.534+(z-1.594)*(.386/.326)
    else:
        z-=.060*max(0,min(1,(z-1.386)/.208))
    return (x*(.160/.125),.009+(y-.009)*(.139/.110),z)


def _face_point(x,z):
    rx,ry,rz=HEAD_RADII
    val=max(.035,1-(x/rx)**2-((z-HEAD_CENTRE.z)/rz)**2)
    p=Vector((x,HEAD_CENTRE.y-ry*math.sqrt(val),z))
    normal=Vector((x/(rx*rx),(p.y-HEAD_CENTRE.y)/(ry*ry),(z-HEAD_CENTRE.z)/(rz*rz))).normalized()
    return p,normal


def _skull_domain_weight(p):
    rx,ry,rz=HEAD_RADII
    if not 1.510<p.z<1.907:return 0
    q=Vector(((p.x-HEAD_CENTRE.x)/rx,(p.y-HEAD_CENTRE.y)/ry,
              (p.z-HEAD_CENTRE.z)/rz))
    if not .88<q.length<1.12:return 0
    weight=1.0
    if p.y<HEAD_CENTRE.y:
        nose=math.sqrt((p.x/.022)**2+((p.z-NOSE_Z)/.023)**2)
        weight*=_smoothstep(1.0,1.65,nose)
    for s in (-1,1):
        ear=math.sqrt(((p.x-s*EAR_X)/.041)**2+(p.y/.041)**2+((p.z-EAR_Z)/.046)**2)
        weight*=_smoothstep(1.0,1.70,ear)
    neck=math.sqrt((p.x/.067)**2+((p.y-NECK_CENTRE[1])/.061)**2+((p.z-1.565)/.048)**2)
    weight*=_smoothstep(1.0,1.70,neck)
    return weight


def _restore_soft_skull_surface(ob):
    """Remove voxel stair steps only in the original smooth skull domain.

    Nose, ear and neck junctions keep their actual rounded union. This moves
    mesh vertices; it does not add a texture or change skinning. The unchanged
    analytic forehead/cheek restores the shared eye anchors.
    """
    rx,ry,rz=HEAD_RADII
    for vertex in ob.data.vertices:
        p=vertex.co.copy();weight=_skull_domain_weight(p)
        if weight<=0:continue
        q=Vector(((p.x-HEAD_CENTRE.x)/rx,(p.y-HEAD_CENTRE.y)/ry,
                  (p.z-HEAD_CENTRE.z)/rz))
        unit=q.normalized()
        target=HEAD_CENTRE+Vector((unit.x*rx,unit.y*ry,unit.z*rz))
        vertex.co=p.lerp(target,weight)
    ob.data.update()


def _exact_skull_normals(ob):
    """Use the true parametric surface gradient where the mesh is exact.

    Adaptive collapse gives a few long triangle fans an incorrect area-average
    normal (actual GLB cheek outliers reached 27 degrees). The forehead/cheek
    geometry is an exact ellipsoid, so its analytic gradient is the correct
    surface normal. Junctions keep ordinary geometry normals; this cannot hide
    a nose/ear/neck shape defect and contains no painted depth or face card.
    """
    rx,ry,rz=HEAD_RADII
    values=[];corrected=0
    for vertex in ob.data.vertices:
        p=vertex.co
        if _skull_domain_weight(p)<.9999:
            values.append((0,0,0));continue
        n=Vector(((p.x-HEAD_CENTRE.x)/(rx*rx),(p.y-HEAD_CENTRE.y)/(ry*ry),
                  (p.z-HEAD_CENTRE.z)/(rz*rz))).normalized()
        values.append(tuple(n));corrected+=1
    # A zero vector means the native, geometry-derived Blender normal.
    ob.data.normals_split_custom_set_from_vertices(values)
    ob.data.update()
    ob['exact_parametric_normal_vertices']=corrected


def _hair_cap(mat,quality,night):
    radial=64 if quality=='high' else 40
    rings=24 if quality=='high' else 16
    verts=[];faces=[]
    n=1+rings*radial
    for inner in (False,True):
        rx=.174-(.014 if inner else 0);ry=.157-(.014 if inner else 0)
        rz=.202-(.014 if inner else 0)
        verts.append((0,.009,HEAD_CENTRE.z+rz))
        for ring in range(1,rings+1):
            for j in range(radial):
                theta=math.tau*j/radial
                # A real thick posterior shell wraps below the ears to nape
                # 1.50; the original round front face is not squeezed flat.
                backness=(1-math.cos(theta))*.5
                # Only the lateral/posterior hem lowers below the ear. Keeping
                # the front opening fixed preserves the already approved round
                # face; the ear-to-neck gap is covered by this same solid shell.
                side_nape=.70*_smoothstep(.20,.45,backness)
                max_a=min(2.88,1.05+1.83*backness+side_nape)
                a=max_a*ring/rings
                nape_drop=.020*backness*_smoothstep(2.30,2.88,a)
                verts.append((rx*math.sin(a)*math.sin(theta),
                    .009-ry*math.sin(a)*math.cos(theta),HEAD_CENTRE.z+rz*math.cos(a)-nape_drop))
        off=n if inner else 0
        for j in range(radial):faces.append((off,off+1+j,off+1+(j+1)%radial))
        for ring in range(rings-1):
            for j in range(radial):
                a=off+1+ring*radial+j;b=off+1+ring*radial+(j+1)%radial
                faces.append((a,b,b+radial,a+radial))
    for j in range(radial):
        a=1+(rings-1)*radial+j;b=1+(rings-1)*radial+(j+1)%radial
        faces.append((a,b,b+n,a+n))
    return _mesh('Hanjing stylized / solid evening hair cap' if night else 'Hanjing stylized / solid side-part hair cap',verts,faces,mat)


def _upper_lid(name,p,n,orient,mat,quality):
    # A real opaque skin flap covers the top of the dark lens; no white rim or
    # full round floating eyeball. The flap follows the lens curvature.
    nx=24 if quality=='high' else 16;ny=8
    verts=[];faces=[]
    transform=orient.to_matrix();rx,depth,rz=EYE_RADII
    for back in (False,True):
        for i in range(ny+1):
            z=rz*(.54+.46*i/ny)
            width=rx*math.sqrt(max(.0001,1-(z/rz)**2))
            for j in range(nx+1):
                x=width*(2*j/nx-1)
                curved=depth*math.sqrt(max(0,1-(x/rx)**2-(z/rz)**2))
                # Local -Y is the lens forward normal; skin covers its crown.
                q=Vector((x,-curved-(.0007 if not back else -.0012),z))
                verts.append(p+transform@q)
    count=(ny+1)*(nx+1)
    for back in (False,True):
        off=count if back else 0
        for i in range(ny):
            for j in range(nx):
                a=off+i*(nx+1)+j;b=a+1;d=a+nx+1;c=d+1
                faces.append((a,b,c,d))
    border=[i for i in range(nx+1)]+[i*(nx+1)+nx for i in range(1,ny+1)]+[ny*(nx+1)+j for j in range(nx-1,-1,-1)]+[i*(nx+1) for i in range(ny-1,0,-1)]
    for i,a in enumerate(border):b=border[(i+1)%len(border)];faces.append((a,b,b+count,a+count))
    return _mesh(name,verts,faces,mat)


def build_stylized_head(source_armature, *, night=False, quality='high',
                          head_anchor=None,source_bbox=None):
    if quality not in ('high','low','mobile'):raise ValueError('quality must be high or low/mobile')
    if quality=='mobile':quality='low'
    if any(abs(source_armature.matrix_world[i][j]-(1 if i==j else 0))>1e-6 for i in range(4) for j in range(4)):
        raise ValueError('Source armature must be normalized to identity before head authoring')
    names=_bone_names(source_armature)
    mats={
        'skin':_mat('Hanjing clay / warm soft fair skin','#f4d1bc',.87,.12),
        'inner_ear':_mat('Hanjing clay / soft rose ear','#dcb19e',.89,.10),
        'hair':_mat('Hanjing clay / muted warm brown hair','#5b433a',.85,.12),
        'hair_soft':_mat('Hanjing clay / broad warm brown wave','#705449',.85,.12),
        'eye':_mat('Hanjing clay / warm brown resin eyes','#624536',.34,.26),
        'pupil':_mat('Hanjing clay / dark warm pupil','#30221b',.32,.25),
        'glint':_mat('Hanjing clay / tiny warm eye glint','#f0e4d3',.31,.23),
        'brow':_mat('Hanjing clay / gentle brown brows','#715348',.89,.10),
        'mouth':_mat('Hanjing clay / small friendly smile','#a47467',.87,.10),
    }
    objects=[]
    skull=_ellipsoid('Hanjing stylized / continuous rounded skull',HEAD_CENTRE,HEAD_RADII,mats['skin'],quality)
    neck=_ellipsoid('Temporary continuous neck',NECK_CENTRE,(.047,.041,.052),mats['skin'],quality)
    np,normal=_face_point(0,NOSE_Z)
    nose=_ellipsoid('Temporary soft button nose',np+normal*.002,(.0095,.0075,.0095),mats['skin'],quality)
    ears=[]
    for s in (-1,1):
        ears.append(_ellipsoid('Temporary rounded ear',(s*EAR_X,.000,EAR_Z),(.025,.017,.029),mats['skin'],quality))
    bpy.context.view_layer.objects.active=skull
    for piece in [neck,nose,*ears]:
        mod=skull.modifiers.new('One continuous skin volume','BOOLEAN');mod.operation='UNION';mod.solver='EXACT';mod.object=piece
        bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(piece,do_unlink=True)
    _rounded_volume(skull,quality)
    _restore_soft_skull_surface(skull)
    _exact_skull_normals(skull)
    objects.append(_rig(skull,source_armature,names,_skin_weights))
    for s,label in ((-1,'left'),(1,'right')):
        inner=_ellipsoid('Hanjing clay / '+label+' ear warmth',(s*.174,-.010,EAR_Z),(.010,.010,.019),mats['inner_ear'],quality)
        objects.append(_rig(inner,source_armature,names,_head_weights))
        p,n=_face_point(s*EYE_X,EYE_Z)
        p+=n*.0018
        orient=Vector((0,-1,0)).rotation_difference(n)
        eye=_ellipsoid('Hanjing clay / '+label+' integrated warm eye',p,EYE_RADII,mats['eye'],quality,orient)
        objects.append(_rig(eye,source_armature,names,_head_weights))
        pupil=_ellipsoid('Hanjing clay / '+label+' soft dark pupil',p+n*.0055,(.0100,.0014,.0138),mats['pupil'],quality,orient)
        objects.append(_rig(pupil,source_armature,names,_head_weights))
        glint_pos=p+orient.to_matrix()@Vector((-.0043,-.0072,.0054))
        glint=_ellipsoid('Hanjing clay / '+label+' gentle eye glint',glint_pos,(.0020,.0010,.0022),mats['glint'],quality,orient)
        objects.append(_rig(glint,source_armature,names,_head_weights))
        # The resin ellipse is deliberately simple and clear, with no pale
        # crescent / white upper patch. Future blinks use a true morph target.
        brow_points=[]
        for i in range(5):
            t=i/4;x=s*EYE_X+(t-.5)*.043;z=EYE_Z+.043+.004*math.sin(math.pi*t)
            q,qn=_face_point(x,z);brow_points.append(q+qn*.0013)
        brow=_tube('Hanjing clay / '+label+' soft curved brow',brow_points,[.0012,.0023,.0025,.0020,.0010],mats['brow'],quality,.70)
        objects.append(_rig(brow,source_armature,names,_head_weights))
    smile_points=[]
    for i in range(7):
        t=i/6;x=(t-.5)*.036;z=1.644+.0050*(2*t-1)**2
        p,n=_face_point(x,z);smile_points.append(p+n*.0012)
    smile=_tube('Hanjing clay / small friendly smile',smile_points,[.0012,.0016,.0018,.0019,.0018,.0016,.0012],mats['mouth'],quality,.72)
    objects.append(_rig(smile,source_armature,names,_head_weights))
    cap=_hair_cap(mats['hair'],quality,night);hair_parts=[cap]
    if night:
        bun=_ellipsoid('Hanjing clay / rounded evening bun',_cute_hair_point((.028,.102,1.837)),(.060,.054,.058),mats['hair'],quality)
        hair_parts.append(bun)
        locks=[
            [( .024,-.025,1.890),(-.002,-.063,1.885),(-.062,-.096,1.842),(-.115,-.059,1.775),(-.125,-.010,1.743)],
            [( .035,-.025,1.890),( .068,-.065,1.873),( .112,-.075,1.811),( .126,-.031,1.763),( .122,.004,1.732)],
        ]
        for i,points in enumerate(locks):
            ob=_tube('Hanjing clay / soft evening sweep '+str(i),[_cute_hair_point(p) for p in points],[r*1.23 for r in [.0015,.019,.024,.019,.002]],mats['hair_soft'] if i==0 else mats['hair'],quality,.72)
            hair_parts.append(ob)
    else:
        locks=[
            [( .025,-.026,1.890),(-.003,-.064,1.884),(-.058,-.099,1.842),(-.115,-.073,1.771),(-.130,-.042,1.714)],
            [(-.074,-.026,1.818),(-.120,-.061,1.756),(-.137,-.073,1.680),(-.116,-.106,1.601),(-.153,-.131,1.506),(-.147,-.121,1.423)],
            [(-.084,.001,1.788),(-.143,-.023,1.725),(-.155,-.029,1.650),(-.179,-.051,1.557),(-.141,-.090,1.442),(-.151,-.075,1.391)],
            [( .038,-.026,1.890),( .078,-.067,1.858),( .115,-.080,1.792),( .134,-.048,1.715),( .127,-.111,1.579),( .160,-.120,1.433)],
            [( .088,.001,1.792),( .134,-.021,1.727),( .155,-.039,1.650),( .179,-.024,1.579),( .162,-.073,1.496),( .150,-.073,1.421)],
        ]
        for i,points in enumerate(locks):
            rr=[.0015,.022,.028,.030,.024,.005] if len(points)==6 else [.0015,.019,.028,.025,.003]
            ob=_tube('Hanjing clay / broad side-part wave '+str(i),[_cute_hair_point(p) for p in points],[r*1.23 for r in rr],mats['hair_soft'] if i in (0,2) else mats['hair'],quality,.74)
            hair_parts.append(ob)
        hair_parts.append(_rear_hair_mass(mats['hair'],quality))
    hair=_unified_hair(hair_parts,mats,quality,night)
    objects.append(_rig(hair,source_armature,names,_head_weights if night else _hair_weights))
    triangles=0
    for ob in objects:ob.data.calc_loop_triangles();triangles+=len(ob.data.loop_triangles)
    crown=max(v.co.z for ob in objects for v in ob.data.vertices)
    # Keep the established 1.92m contact/rig scale.  If a sweep's rounded root
    # exceeds the cap by a fraction, compress only the upper hair smoothly.
    if abs(crown-1.920)>1e-7:
        for ob in objects:
            if not any(word in ob.name for word in ('hair','wave','sweep','bun')):continue
            for v in ob.data.vertices:
                if v.co.z>1.86:
                    v.co.z=1.86+(v.co.z-1.86)*(.06/(crown-1.86))
    diagnostics={
        'style':'cute rounded handmade clay character; approximately five-head proportions',
        'photographOrFaceCardTextures':0,'whiteEyePatches':0,'hairMicrotubes':0,
        'objects':len(objects),'triangles':triangles,'quality':quality,'night':bool(night),
        'forward':'Blender -Y / GLTF +Z','bones':names,
        'headCentre':list(HEAD_CENTRE),'headRadii':list(HEAD_RADII),
        'skinEmission':0,'skinRoughness':.87,'headToBodyRatio':4.974,
        'faceCards':0,'headIdentity':'side-parted broad waves / evening bun; not a face scan',
        'continuousHairVolume':True,'skinJunctionVoxelRounded':True,
        'smoothAnalyticCheekDomainRestored':True,
        'correctMacroNormals':'exact ellipsoid gradient; real union normals elsewhere',
        'lowerJaw':'original C1 soft round volume retained',
        'nape':'real side/posterior hair shell below ears to 1.50; slender neck tucked back 9mm',
        'rearHair':'short cubic soft waves; closed round end',
        'hairCollapsedZeroVolumeIslandsRemoved':hair.get('removed_collapsed_two_face_islands',0),
        'hairExporterValidationWouldModify':False,
    }
    return {'objects':objects,'materials':mats,'diagnostics':diagnostics}
