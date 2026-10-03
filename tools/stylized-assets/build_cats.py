"""Build private, fully volumetric rounded cats with an articulated four-paw rig.

Run with Blender: blender -b --python tools/stylized-assets/build_cats.py
Nothing is written to the public 2D or production assets. Source axes are X right,
Y rear, Z up; glTF export converts to Y up / +Z forward, soles at Y=0.
"""
import bpy, bmesh, json, math, sys
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion

OUT = Path('/workspace/three-world-qa/stylized/cats')
OUT.mkdir(parents=True, exist_ok=True)
FPS = 30
SIDES = [('L', -1), ('R', 1)]
V = lambda p: Vector(p)

def smooth(a, b, x):
    t = min(1., max(0., (x-a)/(b-a)))
    return t*t*(3-2*t)

def linear(x):
    return x/12.92 if x <= .04045 else ((x+.055)/1.055)**2.4

def material(name, color=None, rough=.86):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    low=name.lower()
    mat['clay_surface']='eye' if any(t in low for t in ['eye','iris','pupil','catchlight']) else ('detail' if any(t in low for t in ['nose','ear','mouth','whisker']) else 'fur')
    bs = mat.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Metallic'].default_value = 0
    bs.inputs['Roughness'].default_value = rough
    bs.inputs['Specular IOR Level'].default_value = .22
    if color is None:
        vc = mat.node_tree.nodes.new('ShaderNodeVertexColor')
        vc.layer_name = 'Coat'
        mat.node_tree.links.new(vc.outputs['Color'], bs.inputs['Base Color'])
    else:
        bs.inputs['Base Color'].default_value = (*[linear(c) for c in color], 1)
    return mat

def finish(name, vertices, faces, mat=None):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    bm = bmesh.new(); bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    if bm.calc_volume(signed=True) < 0:
        bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    bm.to_mesh(mesh); bm.free()
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(ob)
    for p in mesh.polygons: p.use_smooth = True
    if mat: mesh.materials.append(mat)
    return ob

def ellipsoid(name, center, radii, mat=None, n=32, rings=20):
    verts=[]; faces=[]
    for j in range(1, rings):
        phi = math.pi*j/rings
        for i in range(n):
            a = math.tau*i/n
            verts.append(V(center)+V((radii[0]*math.sin(phi)*math.cos(a), radii[1]*math.sin(phi)*math.sin(a), radii[2]*math.cos(phi))))
    top=len(verts); verts.append(V(center)+V((0,0,radii[2])))
    bottom=len(verts); verts.append(V(center)-V((0,0,radii[2])))
    for j in range(rings-2):
        for i in range(n):
            a=j*n+i; b=j*n+(i+1)%n
            faces.append((a,b,b+n,a+n))
    for i in range(n):
        k=(rings-2)*n+i; m=(rings-2)*n+(i+1)%n
        faces.extend([(top,(i+1)%n,i),(bottom,k,m)])
    return finish(name,verts,faces,mat)

def tube(name, points, radii, mat=None, radial=16, transported=False):
    verts=[]; faces=[]; previous=None
    for j, pt in enumerate(points):
        d=(V(points[min(j+1,len(points)-1)])-V(points[max(0,j-1)])).normalized()
        if transported:
            side=(previous if previous is not None else V((1,0,0)))
            side=side-d*side.dot(d)
            if side.length<.01:side=V((0,1,0))-d*d.y
            side.normalize();previous=side.copy()
        else:
            side=d.cross(V((1,0,0)))
            if side.length < .01: side=d.cross(V((0,0,1)))
            side.normalize()
        across=side.cross(d).normalized()
        for k in range(radial):
            a=math.tau*k/radial
            verts.append(V(pt)+radii[j]*(across*math.cos(a)+side*math.sin(a)))
    for j in range(len(points)-1):
        for k in range(radial):
            a=j*radial+k; b=j*radial+(k+1)%radial
            faces.append((a,b,b+radial,a+radial))
    for j, rev in [(0,True),(len(points)-1,False)]:
        c=len(verts); verts.append(V(points[j]))
        for k in range(radial):
            f=(c,j*radial+k,j*radial+(k+1)%radial)
            faces.append(tuple(reversed(f)) if rev else f)
    return finish(name,verts,faces,mat)

def fur_loaf(name,start,end,width,depth,normal):
    """Closed, softly tapering clay locks: broad rounded masses, never needles."""
    a,b=V(start),V(end);axis=(b-a).normalized()
    thick=V(normal)-axis*V(normal).dot(axis);thick.normalize()
    wide=axis.cross(thick).normalized();verts=[];faces=[];n=14
    rows=[(0,.58,.65),(.16,.92,.95),(.38,1,1),(.64,.84,.95),(.86,.52,.66),(1,.15,.20)]
    for t,rw,rd in rows:
        center=a.lerp(b,t)+thick*((b-a).length*.06*math.sin(math.pi*t))
        for k in range(n):
            q=math.tau*k/n;verts.append(center+wide*(width*rw*math.cos(q))+thick*(depth*rd*math.sin(q)))
    for j in range(len(rows)-1):
        for k in range(n):
            x=j*n+k;y=j*n+(k+1)%n;faces.append((x,y,y+n,x+n))
    for j,rev in [(0,True),(len(rows)-1,False)]:
        c=len(verts);verts.append(a if j==0 else b)
        for k in range(n):
            f=(c,j*n+k,j*n+(k+1)%n);faces.append(tuple(reversed(f))if rev else f)
    return finish(name,verts,faces)

def almond(ob,cx,cz,rx):
    for v in ob.data.vertices:
        dx=v.co.x-cx
        v.co.z=cz+(v.co.z-cz)*(1-.24*abs(dx/rx))+.055*(1 if cx>0 else -1)*dx
    return ob

def soft_contour(ob,center,radii,strength=.035):
    """Shallow coherent long-coat flow in the whole solid, not attached beads."""
    c=V(center)
    for v in ob.data.vertices:
        d=v.co-c;u=math.atan2(d.y/radii[1],d.x/radii[0])
        phi=math.atan2(d.z/radii[2],math.hypot(d.x/radii[0],d.y/radii[1]))
        flow=strength*(.65*math.sin(7*u+2*phi)+.35*math.sin(11*u-3*phi))
        v.co=c+d*(1+flow)
    return ob

def continuous_ruff():
    # Smooth continuous mane mass. Fur flows down its face, never as horizontal
    # accordion rings; the shallow overlapping locks below share this volume.
    rows=[(.175,.026,.047),(.215,.084,.108),(.27,.149,.147),(.335,.188,.162),(.40,.195,.166),(.46,.159,.140),(.505,.105,.100)]
    n=56;verts=[];faces=[]
    for j,(z,rx,ry)in enumerate(rows):
        for k in range(n):
            a=math.tau*k/n;front=(1-math.cos(a))/2
            wave=.007*(.7*math.cos(7*a+j*.10)+.3*math.cos(11*a-j*.1))*front
            zz=z+.004*math.cos(5*a+j*.10)*front
            verts.append(((rx+wave)*math.sin(a),-.170+(ry+wave*.8)*math.cos(a),zz))
    for j in range(len(rows)-1):
        for k in range(n):
            x=j*n+k;y=j*n+(k+1)%n;faces.append((x,y,y+n,x+n))
    for j,rev in [(0,True),(len(rows)-1,False)]:
        c=len(verts);verts.append((0,-.17,rows[j][0]))
        for k in range(n):
            f=(c,j*n+k,j*n+(k+1)%n);faces.append(tuple(reversed(f))if rev else f)
    return finish('Continuous downward fluffy chest and neck mane',verts,faces)

def soft_paw(name,center,radii,n):
    ob=ellipsoid(name,center,radii,n=n,rings=20)
    for v in ob.data.vertices:
        x,y,z=v.co-V(center)
        front=1-smooth(-.050,-.022,y)
        height=smooth(.009,.035,z)
        groove=sum(math.exp(-((x-s*.023)/.006)**2)for s in [-1,1])
        v.co.y+=.0028*front*height*groove
    return ob

def ear(name, s, inner=False):
    # Full tapered elliptical cross sections, rounded tip, genuine rear surface.
    if inner:
        rows=[(.669,s*.130,-.280,.032,.003),(.699,s*.155,-.273,.029,.003),(.735,s*.173,-.254,.017,.003),(.767,s*.188,-.235,.0015,.0015)]
    else:
        rows=[(.652,s*.125,-.205,.079,.078),(.690,s*.150,-.208,.061,.063),(.730,s*.176,-.208,.041,.049),(.770,s*.192,-.211,.018,.024),(.788,s*.197,-.215,.0025,.003)]
    verts=[]; faces=[]; n=20
    for z,x,y,rx,ry in rows:
        for k in range(n):
            a=math.tau*k/n
            verts.append((x+rx*math.cos(a),y+ry*math.sin(a),z))
    for j in range(len(rows)-1):
        for k in range(n):
            a=j*n+k; b=j*n+(k+1)%n; faces.append((a,b,b+n,a+n))
    for j,rev in [(0,True),(len(rows)-1,False)]:
        z,x,y,_,_=rows[j]; c=len(verts);verts.append((x,y,z))
        for k in range(n):
            f=(c,j*n+k,j*n+(k+1)%n);faces.append(tuple(reversed(f)) if rev else f)
    return finish(name,verts,faces)

def join_union(pieces, quality):
    bpy.ops.object.select_all(action='DESELECT')
    for p in pieces: p.select_set(True)
    bpy.context.view_layer.objects.active=pieces[0]
    bpy.ops.object.join()
    ob=pieces[0]
    rem=ob.modifiers.new('Connected sculpted anatomy','REMESH'); rem.mode='VOXEL'
    rem.voxel_size=.008 if quality=='high' else .010
    rem.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=rem.name)
    sm=ob.modifiers.new('Soft rounded sculpt','SMOOTH');sm.factor=.58;sm.iterations=6
    bpy.ops.object.modifier_apply(modifier=sm.name)
    dec=ob.modifiers.new('Rounded silhouette budget','DECIMATE');dec.ratio=.23 if quality=='high' else .18
    bpy.ops.object.modifier_apply(modifier=dec.name)
    # Flat soles remain planted after smoothing; shoulders retain overlap volume.
    for v in ob.data.vertices:
        if v.co.z < .015: v.co.z=0
    for p in ob.data.polygons:p.use_smooth=True
    return ob

def refine_low_face(ob):
    """Spend a small mobile budget on the cheek/socket transition only.

    The eye volumes, cavity rim and old silhouette vertices remain fixed. Short
    new edges improve smooth normals and sample the existing skin field instead
    of leaving a six-centimetre triangle across the lower cheek.
    """
    bm=bmesh.new();bm.from_mesh(ob.data)
    def in_face(p):return p.y<-.275 and .47<p.z<.735 and abs(p.x)<.20
    selected=[f for f in bm.faces if in_face(f.calc_center_median())]
    bmesh.ops.triangulate(bm,faces=selected,quad_method='BEAUTY',ngon_method='BEAUTY')
    edges=[e for e in bm.edges if e.calc_length()>.030 and all(in_face(v.co)for v in e.verts)]
    edges=sorted(edges,key=lambda e:e.calc_length(),reverse=True)[:240]
    # BMVert Python wrappers are recreated by iteration; wrapper identity cannot
    # distinguish original vertices after an operator. Coordinate keys can,
    # because unsmoothed subdivision leaves every old coordinate unchanged.
    old={tuple(v.co)for v in bm.verts}
    bmesh.ops.subdivide_edges(bm,edges=edges,cuts=1,use_grid_fill=True)
    added=[v for v in bm.verts if tuple(v.co)not in old]
    def near_rim(p):
        return min(((p.x-s*.088)/.053)**2+((p.z-.603)/.055)**2 for s in [-1,1])<1.6
    soften=[v for v in added if in_face(v.co)and not near_rim(v.co)]
    original={v:v.co.copy()for v in soften}
    for repeat in range(2):bmesh.ops.smooth_vert(bm,verts=soften,factor=.22,use_axis_x=True,use_axis_y=True,use_axis_z=True)
    for v,a in original.items():
        delta=v.co-a
        if delta.length>.002:v.co=a+delta.normalized()*.002
    for f in bm.faces:f.smooth=True
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free();ob.data.update()
    ob['low_face_refinement']={'split_edges':len(edges),'added_vertices':len(added),'max_new_vertex_smoothing_m':.002,'original_vertices_fixed':True,'eye_rim_fixed':True}
    print('LOW_FACE_REFINED '+json.dumps(dict(ob['low_face_refinement'])))

def make_rig():
    data=bpy.data.armatures.new('Four paw anatomical bones')
    arm=bpy.data.objects.new('CatRig',data);bpy.context.collection.objects.link(arm)
    bpy.context.view_layer.objects.active=arm;arm.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    spec={
        'Root':((0,0,0),(0,0,.05),None),
        'Hips':((0,.23,.34),(0,.08,.35),'Root'),
        'Spine':((0,.08,.35),(0,-.12,.39),'Hips'),
        'Chest':((0,-.12,.39),(0,-.235,.445),'Spine'),
        'Neck':((0,-.235,.445),(0,-.235,.51),'Chest'),
        'Head':((0,-.235,.51),(0,-.235,.69),'Neck'),
    }
    for side,s in SIDES:
        spec.update({
            f'ForeUpper.{side}':((s*.115,-.19,.34),(s*.115,-.14,.19),'Chest'),
            f'ForeLower.{side}':((s*.115,-.14,.19),(s*.115,-.24,.065),f'ForeUpper.{side}'),
            f'ForePaw.{side}':((s*.115,-.24,.065),(s*.115,-.30,.035),f'ForeLower.{side}'),
            f'HindUpper.{side}':((s*.13,.23,.32),(s*.13,.13,.19),'Hips'),
            f'HindLower.{side}':((s*.13,.13,.19),(s*.13,.33,.065),f'HindUpper.{side}'),
            f'HindPaw.{side}':((s*.13,.33,.065),(s*.13,.27,.035),f'HindLower.{side}'),
        })
        # Half-angle joint helpers keep a single smooth foreleg surface round
        # in a tight bend without separate external sleeves or hard cut caps.
        for joint,left,right in [('ForeElbow','ForeUpper','ForeLower'),('ForeWrist','ForeLower','ForePaw')]:
            a=V(spec[f'{right}.{side}'][0])
            l=(V(spec[f'{left}.{side}'][1])-V(spec[f'{left}.{side}'][0])).normalized()
            r=(V(spec[f'{right}.{side}'][1])-a).normalized()
            spec[f'{joint}.{side}']=(tuple(a),tuple(a+(l+r).normalized()*.055),f'{left}.{side}')
    tail=[(0,.36,.34),(0,.435,.44),(0,.455,.55),(.025,.435,.65),(.09,.405,.721),(.15,.37,.720),(.185,.35,.675)]
    for j in range(6):spec[f'Tail.{j+1:02}']=(tail[j],tail[j+1],'Hips' if j==0 else f'Tail.{j:02}')
    for name,(a,b,parent) in spec.items():
        bone=data.edit_bones.new(name);bone.head=a;bone.tail=b
        if parent:bone.parent=data.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    for pb in arm.pose.bones:pb.rotation_mode='QUATERNION'
    return arm,spec,tail

def skin(ob, arm, weights):
    groups={n:ob.vertex_groups.new(name=n) for n in arm.data.bones.keys()}
    for i,v in enumerate(ob.data.vertices):
        w=weights(v.co,i)
        w={n:x for n,x in w.items() if x>1e-5};total=sum(w.values())
        for n,x in w.items():groups[n].add([i],x/total,'REPLACE')
    mod=ob.modifiers.new('Continuous four foot skin','ARMATURE');mod.object=arm
    ob.parent=arm

def anatomy_weights(v, _):
    x,y,z=v
    # Spatially bounded, continuous regions: the back never follows Head, and
    # the shoulder/neck boundary cannot create a hard triangular fin in rearing.
    h=smooth(.438,.515,z)*(1-smooth(-.035,.035,y))
    n=smooth(.32,.44,z)*(1-smooth(-.10,.03,y))
    body=(1-h)*(1-n)
    if y<-.035:
        c=1-smooth(-.18,-.035,y)
        return {'Head':h,'Neck':n*(1-h),'Chest':body*c,'Spine':body*(1-c)}
    hip=smooth(.035,.21,y)
    return {'Head':h,'Neck':n*(1-h),'Hips':body*hip,'Spine':body*(1-hip)}

def coat_color(v, cat, tail=False, limb=False):
    x,y,z=v
    if cat=='jinbingbing':
        pale=(.91,.875,.80); gold=(.72,.65,.54);side=(.81,.74,.64)
        top=smooth(.275,.51,z)*(.60+.40*smooth(-.28,.0,y))
        if tail:top=.56+.12*math.sin(z*8)
        ruff=(1-smooth(-.25,-.12,y))* (1-smooth(.44,.56,z))
        paws=1-smooth(.06,.15,z)
        # Original shaded golden forehead, no hand-drawn bracket eye markings.
        if z>.57 and y<-.25:top=max(top,.48+.22*smooth(.58,.72,z))
        c=tuple(side[i]*(1-top)+gold[i]*top for i in range(3))
        ivory=max(ruff,paws)
        c=tuple(c[i]*(1-ivory)+pale[i]*ivory for i in range(3))
        if limb:
            # Golden longhair paws are softly cream all the way into the ruff,
            # unlike XiaoHei's sharply bounded white socks.
            tip=.24*smooth(.235,.36,z)
            c=tuple(pale[i]*(1-tip)+side[i]*tip for i in range(3))
        if y<-.29 and .585<z<.728:
            # Pigment follows the original shaded forehead, not a face photo.
            stripe=sum(math.exp(-((x-k*(.048+.05*(.72-z)))/.011)**2)for k in [-1,0,1])
            shade=.11*min(1,stripe)*smooth(.585,.625,z)*(1-smooth(.705,.728,z))
            c=tuple(q*(1-shade)for q in c)
        return c
    base=(.24,.275,.280); white=(.93,.945,.912)
    chest=(1-smooth(-.22,-.11,y))*(1-smooth(.36,.51,z))*(1-smooth(.07,.125,abs(x)))
    socks=1-smooth(.065,.099,z)
    chin=(1-smooth(-.35,-.31,y))*(1-smooth(.485,.513,z))
    if limb:chest=chin=0
    whiten=min(1,max(chest,socks,chin)) if not tail else 0
    shade=.88+.12*smooth(.2,.65,z)
    return tuple(base[i]*shade*(1-whiten)+white[i]*whiten for i in range(3))

def add_coat(ob, mat, cat, tail=False, limb=False):
    ob.data.materials.clear();ob.data.materials.append(mat)
    attr=ob.data.color_attributes.new(name='Coat',type='FLOAT_COLOR',domain='POINT')
    for i,v in enumerate(ob.data.vertices):attr.data[i].color=(*[linear(c) for c in coat_color(v.co,cat,tail,limb)],1)

def make_cat(cat, quality):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    for datablock in [bpy.data.meshes,bpy.data.armatures,bpy.data.actions,bpy.data.materials]:
        for item in list(datablock):
            if item.users==0:datablock.remove(item)
    scene=bpy.context.scene;scene.render.fps=FPS;scene.frame_start=0
    jin=cat=='jinbingbing';n=32 if quality=='high' else 20
    objects=[];pieces=[];limbs=[]
    pieces.append(soft_contour(ellipsoid('Torso', (0,.065,.329),(.184,.273,.205),n=n),(0,.065,.329),(.184,.273,.205),.025)if jin else ellipsoid('Torso',(0,.065,.35),(.173,.285,.205),n=n))
    pieces.append(ellipsoid('Shoulders',(0,-.155,.37),(.176,.185,.18),n=n))
    pieces.append(continuous_ruff()if jin else ellipsoid('Neck and thick ruff',(0,-.17,.438),(.146,.155,.166),n=n))
    pieces.append(ellipsoid('Rounded full skull',(0,-.222,.574),(.207 if jin else .188,.175,.180),n=n))
    if not jin:
        # The short-haired cat has no long mane to span a raised front shoulder.
        # These are solid anatomical clavicle/shoulder transitions, united with
        # the torso rather than a flat patch over a dynamically exposed triangle.
        for s in [-1,1]:pieces.append(ellipsoid('Continuous full shoulder bridge',(s*.112,-.215,.398),(.095,.108,.117),n=n))
    if jin:
        for s in [-1,1]:
            pieces.append(soft_contour(ellipsoid('Soft longhair cheek', (s*.150,-.223,.527),(.093,.136,.102),n=n),(s*.150,-.223,.527),(.093,.136,.102),.055))
            for j,z in enumerate([.557,.521,.491]):
                pieces.append(fur_loaf('Fused soft cheek flow',(s*.150,-.270,z),(s*(.242 if j==1 else .226),-.246,z-.031),.040,.030,(s,-.4,.2)))
            pieces.append(ellipsoid('Rounded shoulder ruff',(s*.115,-.215,.367),(.100,.122,.125),n=n))
            pieces.append(ellipsoid('Longhair flank',(s*.13,.215,.335),(.072,.143,.151),n=n))
            pieces.append(fur_loaf('Fused soft flank silhouette',(s*.147,.138,.435),(s*.218,.225,.298),.074,.028,(s,.2,.1)))
        for j in range(9):
            a=math.pi-1.18+j*(2.36/8)
            root=(.139*math.sin(a),-.17+.117*math.cos(a),.432+.010*math.cos(j*1.7))
            end=(.177*math.sin(a),-.17+.173*math.cos(a),.198+.045*abs(math.sin(a))+.016*math.sin(j*1.8))
            pieces.append(fur_loaf('Deep-rooted downflow mane '+str(j),root,end,.061+.005*math.sin(j),.029,(math.sin(a),math.cos(a),-.05)))
    for side,s in SIDES:
        pieces.append(ear('Solid pointed ear '+side,s))
        fore=[(s*.115,-.19,.34),(s*.115,-.14,.19),(s*.115,-.24,.065)]
        hind=[(s*.13,.23,.32),(s*.13,.13,.19),(s*.13,.33,.065)]
        for kind,path in [('Fore',fore),('Hind',hind)]:
            if kind=='Fore':
                pts=[];rs=[]
                radii=[.077,.068,.052]
                for index in range(2):
                    a,b=V(path[index]),V(path[index+1])
                    for k in range(8):
                        f=k/8;pts.append(a.lerp(b,f));rs.append(radii[index]*(1-f)+radii[index+1]*f)
                pts.append(V(path[-1]));rs.append(radii[-1])
                caps=[tube('Full uninterrupted foreleg '+side,pts,rs,radial=24),ellipsoid('Deep overlapped soft shoulder '+side,path[0],(.083,.086,.085),n=24,rings=18),ellipsoid('Continuous rounded elbow '+side,path[1],(.072,.077,.075),n=24,rings=18),ellipsoid('Continuous furry wrist '+side,path[2],(.061,.066,.051),n=24,rings=18),soft_paw('Fore soft furry round paw '+side,(s*.115,-.265,.050),(.069,.079,.050),n)]
                cp=join_union(caps,quality);cp.name='Fore continuous rounded articulated leg '+side
                limbs.append((cp,kind,side,path,None))
                continue
            r=[.067,.055,.045] if kind=='Fore' else [.086,.064,.046]
            pts=[];rs=[]
            for j in range(2):
                for k in range(6):
                    f=k/6;pts.append(V(path[j]).lerp(V(path[j+1]),f));rs.append(r[j]*(1-f)+r[j+1]*f)
            pts.append(V(path[-1]));rs.append(r[-1])
            limbparts=[tube(kind+' solid anatomical leg '+side,pts,rs,radial=20),ellipsoid(kind+' soft joint '+side,path[1],(.057,.063,.065),n=24,rings=16),ellipsoid(kind+' rounded upper attachment '+side,path[0],(.071,.076,.076) if kind=='Fore' else (.086,.09,.099),n=24,rings=16)]
            center=(s*.115,-.275,.035) if kind=='Fore' else (s*.13,.295,.035)
            limbparts.append(ellipsoid(kind+' soft paw '+side,center,(.070,.089,.035) if kind=='Fore' else (.067,.085,.035),n=24,rings=16))
            limb=join_union(limbparts,quality);limb.name=kind+' continuous shoulder joint and paw '+side
            limbs.append((limb,kind,side,path,None))
    body=join_union(pieces,quality);body.name=cat+' continuous rounded four-paw anatomy'
    # Carve shallow real sockets into the complete skull. The eye volumes sit
    # behind the original face silhouette instead of protruding like buttons.
    for side,s in SIDES:
        cx=s*(.088 if jin else .082)
        cutter=almond(ellipsoid('Temporary eye socket cutter '+side,(cx,-.375 if jin else -.38,.603),(.046,.039,.049),n=28,rings=18),cx,.603,.046)
        bpy.context.view_layer.objects.active=body
        mod=body.modifiers.new('Sculpted inset eye socket '+side,'BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
        bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.data.objects.remove(cutter,do_unlink=True)
    if jin and quality=='low':refine_low_face(body)
    for p in body.data.polygons:p.use_smooth=True
    coat=material(cat+' matte fur');add_coat(body,coat,cat);objects.append(body)
    arm,spec,tailpath=make_rig()
    def bodyweights(v,i):
        weights=anatomy_weights(v,i)
        nearest=min((V(v)-V((s*.115,-.19,.34))).length for s in [-1,1])
        shoulder=1-smooth(.055,.115,nearest)
        if not jin:
            # The new integrated bridge must move with the chest-side socket,
            # not with the independently counter-rotating upper cheek/head.
            bridge=min((V(v)-V((s*.112,-.215,.398))).length for s in [-1,1])
            shoulder=max(shoulder,1-smooth(.04,.10,bridge))
        weights={name:w*(1-shoulder)for name,w in weights.items()}
        weights['Chest']=weights.get('Chest',0)+shoulder
        return weights
    skin(body,arm,bodyweights)
    fore_parts={side:[]for side,s in SIDES}
    for limb,kind,side,path,rigidbone in limbs:
        add_coat(limb,coat,cat,limb=True)
        def limbweights(v,i,kind=kind,side=side,path=path):
            # Only the adjacent two bones can influence a joint. Torso vertices
            # never follow a foot; limb roots overlap the full solid shoulders.
            z=v.z
            if kind=='Fore':
                if z>.125:
                    upper=smooth(.19,.255,z);lower=1-smooth(.125,.19,z)
                    return {f'ForeUpper.{side}':upper,f'ForeElbow.{side}':1-upper-lower,f'ForeLower.{side}':lower}
                lower=smooth(.065,.125,z);paw=1-smooth(.025,.065,z)
                return {f'ForeLower.{side}':lower,f'ForeWrist.{side}':1-lower-paw,f'ForePaw.{side}':paw}
            upper=smooth(.160,.222,z);paw=1-smooth(.057,.095,z)
            return {f'{kind}Upper.{side}':upper*(1-paw),f'{kind}Lower.{side}':(1-upper)*(1-paw),f'{kind}Paw.{side}':paw}
        skin(limb,arm,(lambda v,i,bn=rigidbone:{bn:1})if rigidbone else limbweights)
        if kind=='Fore':fore_parts[side].append(limb)
        else:objects.append(limb)
    for side,parts in fore_parts.items():
        bpy.ops.object.select_all(action='DESELECT')
        for cp in parts:cp.select_set(True)
        bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join()
        parts[0].name='Fore continuous smooth soft anatomy '+side;objects.append(parts[0])
    # Plumed tail is real cross-section geometry with six articulated bones.
    tailr=[.045,.079,.097,.094,.068,.036,.012] if jin else [.038,.040,.039,.035,.031,.024,.005]
    path=[];r=[]
    def catmull(a,b,c,d,t):
        return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)
    for j in range(6):
        for k in range(5):
            f=k/5;path.append(catmull(V(tailpath[max(0,j-1)]),V(tailpath[j]),V(tailpath[j+1]),V(tailpath[min(6,j+2)]),f));r.append(tailr[j]*(1-f)+tailr[j+1]*f)
    path.append(V(tailpath[-1]));r.append(tailr[-1])
    if jin:
        # A thick tube may fold through itself at a tight curl. Limit the inner
        # bend by local curvature, then round off the tip as part of the plume.
        for j in range(1,len(path)-1):
            before=path[j]-path[j-1];after=path[j+1]-path[j]
            angle=before.angle(after)
            if angle>.001:
                curve_radius=(before.length+after.length)/(4*math.sin(angle/2))
                r[j]=min(r[j],curve_radius*.62)
        for repeat in range(3):
            r=[min(a,(r[max(0,i-1)]+2*a+r[min(len(r)-1,i+1)])/4) for i,a in enumerate(r)]
        final=(path[-1]-path[-2]).normalized();p=path[-1].copy()
        for length,radius in [(.006,.011),(.012,.007),(.017,.001)]:path.append(p+final*length);r.append(radius)
    tail=tube('Continuous upright right-curled plume',path,r,coat,radial=20 if quality=='high' else 12,transported=True)
    if jin:
        radial=20 if quality=='high' else 12
        for i,v in enumerate(tail.data.vertices):
            row=min(len(path)-1,i//radial);q=math.tau*(i%radial)/radial
            d=v.co-path[row]
            v.co=path[row]+d*(1+.045*math.sin(6*q+.17*row)+.035*math.cos(4*q-.11*row))
    add_coat(tail,coat,cat,True)
    def tailweights(v,i):
        row=min(len(path)-1,i//(20 if quality=='high' else 12));u=row/5
        j=min(5,int(u));f=u-j
        if j==5:return {'Tail.06':1}
        return {f'Tail.{j+1:02}':1-f,f'Tail.{j+2:02}':f}
    skin(tail,arm,tailweights);objects.append(tail)
    rigid=lambda v,i:{'Head':1}
    ivory=material('Soft cream muzzle' if jin else 'Tuxedo white chin',(.955,.906,.795) if jin else (.93,.94,.91))
    pink=material('Natural muted rose nose and ear',(.64,.40,.38),.82)
    ear_mat=material('Warm inner ear',(.56,.49,.46) if jin else (.42,.36,.35),.90)
    charcoal=material('Soft graphite eye and mouth',(.070,.085,.080),.80)
    iris=material('Blue green iris' if jin else 'Olive iris',(.34,.49,.43) if jin else (.53,.56,.31),.63)
    eye=material('Dark natural cat eye rim',(.11,.14,.12),.74)
    glint=material('Small natural eye highlight',(.99,.99,.95),.4)
    whisker_mat=material('Fine warm whiskers',(.89,.87,.78) if jin else (.69,.72,.69),.93)
    def face(ob,mat=None):
        if mat:ob.data.materials.append(mat)
        skin(ob,arm,rigid);objects.append(ob);return ob
    for side,s in SIDES:
        face(ear('Inset three-dimensional inner ear '+side,s,True),ear_mat)
        # Globe and iris are full volumes, mostly inset in the complete skull.
        cx=s*(.088 if jin else .082);cy=-.354 if jin else -.357;cz=.603
        face(almond(ellipsoid('Full inset cat eye '+side,(cx,cy,cz),(.041,.013,.039),eye,n=28,rings=16),cx,cz,.041))
        face(ellipsoid('Iris '+side,(cx,cy-.012,cz),(.034,.005,.030),iris,n=24,rings=14))
        face(ellipsoid('Natural oval pupil '+side,(cx,cy-.016,cz),(.017,.003,.024),charcoal,n=20,rings=12))
        face(ellipsoid('Quiet eye catchlight '+side,(cx-.010,cy-.020,cz+.013),(.0045,.002,.005),glint,n=12,rings=8))
        for k in range(3):
            z=.514+k*.013;endz=z+(k-1)*.024
            pts=[(s*.035,-.416,z),(s*.115,-.42,z+.005),(s*.208,-.42,endz+.009),(s*.268,-.395,endz)]
            face(tube('Fine curved whisker '+side+str(k),pts,[.0012,.0011,.0008,.0002],whisker_mat,radial=6))
    muzzleparts=[ellipsoid('Soft whole muzzle',(0,-.377,.503),(.086,.038,.051),n=28,rings=18),ellipsoid('Soft cheek part L',(-.034,-.382,.513),(.050,.030,.032),n=24,rings=16),ellipsoid('Soft cheek part R',(.034,-.382,.513),(.050,.030,.032),n=24,rings=16),ellipsoid('Soft small chin',(0,-.365,.474),(.046,.031,.026),n=24,rings=16)]
    muzzle=join_union(muzzleparts,quality);muzzle.name='Sculpted connected soft muzzle and chin';face(muzzle,ivory)
    # Rounded triangular pink nose, not a flat stamp.
    nose=finish('Soft three dimensional triangular nose',[(-.025,-.417,.545),(.025,-.417,.545),(0,-.426,.521),(-.018,-.398,.540),(.018,-.398,.540),(0,-.405,.522)],[(0,1,2),(3,5,4),(0,3,4,1),(1,4,5,2),(2,5,3,0)],pink)
    bevel=nose.modifiers.new('Rounded nose edges','BEVEL');bevel.width=.004;bevel.segments=3
    bpy.context.view_layer.objects.active=nose;bpy.ops.object.modifier_apply(modifier=bevel.name)
    for v in nose.data.vertices:v.co.x*=.76
    face(nose)
    face(tube('Small quiet mouth',[(0,-.409,.522),(0,-.409,.510),(-.010,-.409,.506)],[.0015,.0014,.0007],charcoal,radial=6))
    face(tube('Other half of small quiet mouth',[(0,-.409,.510),(.010,-.409,.506)],[.0014,.0007],charcoal,radial=6))
    arm['asset_kind']='rounded-quadruped-cat';arm['cat_id']=cat;arm['standing_height_source_m']=.82
    arm['walk_stride_source_m']=.34;arm['walk_cycle_seconds']=.8;arm['forward_axis']='+Z';arm['feet_y']=0
    arm['tail_sway_local_axis']='Z';arm['tail_sway_bone']='Tail.01';arm['tail_tip_bone']='Tail.05'
    arm['anatomy']='complete closed sculpted torso, four two-joint legs, head, inset volume eyes, six-bone connected tail'
    return arm,spec,objects

def transform_point(matrix,p):return matrix@V(p)

def bone_matrix(arm,name,a,b,roll=None):
    bone=arm.data.bones[name]
    rest=(bone.tail_local-bone.head_local).normalized()
    q=rest.rotation_difference((V(b)-V(a)).normalized())@bone.matrix_local.to_quaternion()
    if roll:q=roll@q
    return Matrix.LocRotScale(V(a),q,V((1,1,1)))

def solve_knee(a,c,l1,l2,back):
    d=V(c)-V(a);dist=min(l1+l2-1e-5,max(1e-5,d.length));e=d.normalized()
    along=(l1*l1-l2*l2+dist*dist)/(2*dist)
    h=math.sqrt(max(0,l1*l1-along*along))
    pole=V((0,back,0));pole=(pole-e*pole.dot(e)).normalized()
    return V(a)+e*along+pole*h

def posed(arm,spec,mode,t):
    mats={'Root':arm.data.bones['Root'].matrix_local.copy()}
    is_idle=mode in ('Idle','Groom')
    sit=1 if is_idle else 0
    pounce=0
    if mode=='Pounce':
        pounce=smooth(0,.65,t)*(1-smooth(3.15,4.4,t))
    bob=.004*math.sin(math.tau*t/.8*2) if mode=='Walk' else 0
    hip=V((0,.23+.05*sit,.34-.095*sit+bob))
    if sit:
        directions=[V((0,-.98,.20)),V((0,-.866,.50)),V((0,-.866,.50))]
    else:
        directions=[V(spec[n][1])-V(spec[n][0]) for n in ['Hips','Spine','Chest']]
    tilt=Quaternion(V((1,0,0)),-.35*pounce)
    last=hip
    for name,d in zip(['Hips','Spine','Chest'],directions):
        length=arm.data.bones[name].length
        nxt=last+tilt@d.normalized()*length
        mats[name]=bone_matrix(arm,name,last,nxt);last=nxt
    neck_dir=tilt@V((0,0,1));headroot=last+neck_dir*arm.data.bones['Neck'].length
    mats['Neck']=bone_matrix(arm,'Neck',last,headroot)
    grooming=smooth(.35,.85,t)*(1-smooth(3.35,4.0,t)) if mode=='Groom' else 0
    q=Quaternion(V((0,0,1)),.035*math.sin(math.tau*t/3)) if is_idle else Quaternion()
    q=Quaternion(V((1,0,0)),.30*grooming+.22*pounce)@q
    mats['Head']=Matrix.LocRotScale(headroot,q@arm.data.bones['Head'].matrix_local.to_quaternion(),V((1,1,1)))
    # Fixed-length legs, actual ground paw targets. World-space shoulder follows chest.
    for side,s in SIDES:
        for kind,host in [('Fore','Chest'),('Hind','Hips')]:
            up,lo,paw=[f'{kind}{n}.{side}' for n in ['Upper','Lower','Paw']]
            host_rest=arm.data.bones[host].matrix_local
            joint=mats[host]@host_rest.inverted()@V(spec[up][0])
            ankle=V(spec[lo][1]);toe=V(spec[paw][1])
            if sit and kind=='Hind':
                ankle=V((s*.15,.19,.065));toe=V((s*.15,.13,.035))
            if mode=='Walk':
                phase=(t/.8 + (0 if (side=='L')==(kind=='Fore') else .5))%1
                stance=.58;a=.34*stance/2
                if phase<stance:
                    offset=-a+.34*phase;lift=0
                else:
                    u=(phase-stance)/(1-stance);m=.34*(1-stance)
                    offset=(2*u**3-3*u*u+1)*a+(u**3-2*u*u+u)*m+(-2*u**3+3*u*u)*(-a)+(u**3-u*u)*m
                    lift=.035*16*u*u*(1-u)*(1-u)
                ankle.y+=offset;toe.y+=offset;ankle.z+=lift;toe.z+=lift
            if kind=='Fore' and pounce:
                target=joint+V((s*.095,-.220,.085)) if side=='R' else joint+V((0,-.115,.035))
                ankle=ankle.lerp(target,pounce)
                toe=toe.lerp(target+V((0,-.043,-.021)),pounce)
            if kind=='Fore' and side=='R' and grooming:
                mouth=mats['Head']@arm.data.bones['Head'].matrix_local.inverted()@V((0,-.413,.512))
                target=mouth+V((.037,.016,-.062))
                target.z+=.006*math.sin(t*math.tau*2)
                ankle=ankle.lerp(target,grooming);toe=toe.lerp(target+V((0,-.024,.012)),grooming)
            knee=solve_knee(joint,ankle,arm.data.bones[up].length,arm.data.bones[lo].length,1 if kind=='Fore' else -1)
            mats[up]=bone_matrix(arm,up,joint,knee)
            mats[lo]=bone_matrix(arm,lo,knee,ankle)
            mats[paw]=bone_matrix(arm,paw,ankle,toe)
            if kind=='Fore':
                for name,point,d1,d2 in [('ForeElbow',knee,knee-joint,ankle-knee),('ForeWrist',ankle,ankle-knee,toe-ankle)]:
                    bisect=(d1.normalized()+d2.normalized()).normalized()
                    mats[f'{name}.{side}']=bone_matrix(arm,f'{name}.{side}',point,point+bisect*.055)
    # Upright neutral Walk tail; runtime adds slow independent happy sway.
    for j in range(6):
        name=f'Tail.{j+1:02}';parent='Hips' if j==0 else f'Tail.{j:02}'
        local=arm.data.bones[parent].matrix_local.inverted()@arm.data.bones[name].matrix_local
        bend=0
        if is_idle: bend=(.055 if j<3 else .15)*math.sin(math.tau*t/3+.4*j)
        if pounce:bend+=.18*pounce*(1 if j>2 else -.4)
        mats[name]=mats[parent]@local@Matrix.Rotation(bend,4,'Z')
    return mats

def animate(arm,spec):
    clips=[('Idle',3.0),('Walk',.8),('Pounce',4.4),('Groom',4.0)]
    arm.animation_data_create()
    for name,duration in clips:
        action=bpy.data.actions.new(name);arm.animation_data.action=action
        frames=round(duration*FPS)
        for f in range(frames+1):
            bpy.context.scene.frame_set(f)
            mats=posed(arm,spec,name,f/FPS)
            # Parent order is guaranteed by insertion order. Set full matrices, update
            # dependency graph before descendants so skinning remains connected.
            for bn,matrix in mats.items():
                pb=arm.pose.bones[bn];pb.matrix=matrix
                bpy.context.view_layer.update()
            for pb in arm.pose.bones:
                pb.keyframe_insert(data_path='location',frame=f,group=pb.name)
                pb.keyframe_insert(data_path='rotation_quaternion',frame=f,group=pb.name)
            for fc in action.fcurves:
                for point in fc.keyframe_points:point.interpolation='LINEAR'
        arm.animation_data.action=None
        track=arm.animation_data.nla_tracks.new();track.name=name
        strip=track.strips.new(name,0,action);strip.action_frame_start=0;strip.action_frame_end=frames
        strip.blend_type='REPLACE';track.mute=True
    for pb in arm.pose.bones:pb.matrix_basis=Matrix.Identity(4)
    bpy.context.view_layer.update()
    return [{'name':name,'duration':duration} for name,duration in clips]

def inspect_meshes(objects):
    stats=[]
    for ob in objects:
        bm=bmesh.new();bm.from_mesh(ob.data)
        boundary=sum(1 for e in bm.edges if e.is_boundary);nonmanifold=sum(1 for e in bm.edges if not e.is_manifold)
        volume=bm.calc_volume(signed=True);bm.free()
        stats.append({'name':ob.name,'vertices':len(ob.data.vertices),'triangles':sum(len(p.vertices)-2 for p in ob.data.polygons),'boundary_edges':boundary,'nonmanifold_edges':nonmanifold,'signed_volume_m3':volume})
    return stats

def main():
    report={'axes':'glTF Y-up, +Z forward, feetY0','style':'rounded full-volume cartoon cats, no face cards or photo textures','assets':[]}
    args=sys.argv[sys.argv.index('--')+1:]if '--'in sys.argv else []
    selected=args[args.index('--only')+1].split(':')if '--only'in args else None
    if selected and (OUT/'build-report.json').exists():
        report['assets']=[a for a in json.loads((OUT/'build-report.json').read_text())['assets']if[a['id'],a['quality']]!=selected]
    for cat in ['jinbingbing','xiaohei']:
        for quality in ['high','low']:
            if selected and [cat,quality]!=selected:continue
            arm,spec,objects=make_cat(cat,quality)
            clips=animate(arm,spec)
            stats=inspect_meshes(objects)
            height=max(v.co.z for ob in objects for v in ob.data.vertices)
            bottom=min(v.co.z for ob in objects for v in ob.data.vertices)
            bpy.context.scene['standing_height_source_m']=.82
            bpy.context.scene['walk_stride_source_m']=.34
            bpy.context.scene['walk_cycle_seconds']=.8
            bpy.context.scene['tail_sway_local_axis']='Z'
            bpy.context.scene['cat_id']=cat
            for track in arm.animation_data.nla_tracks:track.mute=False
            bpy.ops.object.select_all(action='DESELECT')
            arm.select_set(True)
            for ob in objects:ob.select_set(True)
            bpy.context.view_layer.objects.active=arm
            path=OUT/f'{cat}-{quality}.glb'
            bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False)
            # Retain source privately only for reproducible inspections.
            for track in arm.animation_data.nla_tracks:track.mute=True
            for pb in arm.pose.bones:pb.matrix_basis=Matrix.Identity(4)
            bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'{cat}-{quality}.blend'))
            report['assets'].append({'id':cat,'quality':quality,'file':str(path),'bytes':path.stat().st_size,'standing_bounds_m':[bottom,height],'clips':clips,'mesh_stats':stats,'total_triangles':sum(s['triangles'] for s in stats),'total_vertices':sum(s['vertices'] for s in stats)})
    (OUT/'build-report.json').write_text(json.dumps(report,indent=2))
    print('CAT_BUILD_COMPLETE '+json.dumps([{k:a[k] for k in ['id','quality','bytes','total_triangles','standing_bounds_m']} for a in report['assets']]))

if __name__=='__main__':main()
