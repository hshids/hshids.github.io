"""Local, texture-free rounded characters on the established Hanjing motion rig.

This intentionally does not import the rejected legacy face builder. Existing
wardrobe topology, weights, morphs and animation are read-only source data; new
PBR palettes and authored rounded head/hair volumes form one cartoon treatment.
All exports are private unless a reviewer explicitly supplies another directory.
Run: blender -b --python tools/stylized-assets/build_humans.py -- --repo ...
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import sys

import bpy
import bmesh
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform

parser = argparse.ArgumentParser()
parser.add_argument('--repo', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, default=Path('/workspace/three-world-qa/stylized/humans'))
parser.add_argument('--night', action='store_true')
parser.add_argument('--quality', choices=('high', 'low'), default='high')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
REPO, OUTDIR = args.repo.resolve(), args.output_dir.resolve()
OUTDIR.mkdir(parents=True, exist_ok=True)
NAME = f"hanjing-{'night' if args.night else 'day'}-{args.quality}"
SOURCE = REPO / 'assets/three/models' / (
    ('night-wardrobe-mobile.glb' if args.quality == 'low' else 'night-wardrobe-study.glb')
    if args.night else ('human-day-mobile.glb' if args.quality == 'low' else 'human-day-study.glb'))
source_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
builder_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
scene = bpy.context.scene
# The GLTF importer uses the current scene FPS to reconstruct clip key times.
# Keep its original default (24) rather than multiplying action playback speed.
scene.unit_settings.system = 'METRIC'
rig = next(o for o in scene.objects if o.type == 'ARMATURE')
rig.name = 'HanjingRig'
assert len(rig.data.bones) == 34
assert all(k in rig.data.bones for k in ('Head', 'Neck', 'Chest', 'Hand.L', 'Hand.R'))
assert all(abs(rig.matrix_world[i][j] - (1 if i == j else 0)) < 1e-5 for i in range(4) for j in range(4))

# Blender's import creates an unbound custom-shape Icosphere for bone display.
# It is not character geometry and must never become a renderable asset.
for ob in list(scene.objects):
    if ob.type == 'MESH' and not any(m.type == 'ARMATURE' for m in ob.modifiers):
        bpy.data.objects.remove(ob, do_unlink=True)
    elif ob.type == 'MESH' and not args.night:
        if any(k in ob.name.lower() for k in ('hair', 'curl', 'face skull', 'eye cap', 'eyelid')):
            bpy.data.objects.remove(ob, do_unlink=True)

sys.path.insert(0, str(Path(__file__).resolve().parent))
from human_details import build_stylized_head
helper_hash = hashlib.sha256((Path(__file__).parent / 'human_details.py').read_bytes()).hexdigest()
head = build_stylized_head(rig, night=args.night, quality=args.quality,
                           head_anchor=rig.matrix_world @ rig.data.bones['Head'].head_local)
for ob in head['objects']:
    for mat in ob.data.materials:
        name=mat.name.lower()
        mat['clay_surface']='skin' if mat==head['materials']['skin'] else 'hair' if 'hair' in name else 'detail'
        if any(k in name for k in ('eye','iris','pupil','glint')):
            mat['clay_grain_exclude']=True


def linear(v):
    return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4


def color(code):
    code = code.removeprefix('#')
    return tuple(linear(int(code[i:i+2], 16) / 255) for i in (0, 2, 4)) + (1,)


def material(name, hexcolor, roughness=.65, metal=0, emission=0):
    mat = bpy.data.materials.new('Cartoon / ' + name)
    mat.use_nodes = True
    bs = mat.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = color(hexcolor)
    bs.inputs['Roughness'].default_value = roughness
    bs.inputs['Metallic'].default_value = metal
    bs.inputs['Specular IOR Level'].default_value = .28
    if emission:
        bs.inputs['Emission Color'].default_value = color(hexcolor)
        bs.inputs['Emission Strength'].default_value = emission
    mat['clay_surface']='silk' if 'qipao' in name else 'cloth' if any(k in name for k in ('cloth','coat','cuff','blouse','gabardine','lining','trousers')) else 'detail'
    return mat


skin = head['materials']['skin']
skin['clay_surface']='skin'
palette = {
    'coat': material('soft grey beige gabardine', '#c4ac8d', .82),
    'lining': material('soft beige trench lining', '#b89e7f', .85),
    'cuff': material('folded cuff and lapel cloth', '#d1baa0', .82),
    'blouse': material('warm ivory blouse', '#eee4d1', .79),
    'trousers': material('soft charcoal trousers', '#494440', .82),
    'buttons': material('muted brown clay buttons', '#8f765f', .68),
    'buckles': material('antique brass cuff buckles', '#ad8b4b', .42, .5),
    'shoes': material('rounded chestnut loafers', '#614130', .43),
    'sole': material('dark soft leather soles', '#2a2420', .83),
    'silk': material('midnight qipao silk', '#282d38', .53),
    'silk_lining': material('dark qipao lining', '#1d2129', .78),
    'gold': material('warm golden bamboo embroidery', '#bda36c', .54, .15),
    'night_shoes': material('rounded midnight flats', '#292834', .51),
    'brass': material('lantern bronze frame', '#a27941', .45, .55),
    'paper': material('warm vermilion lantern paper', '#da5e40', .83, emission=.4),
    'tassel': material('red silk lantern tassel', '#a74232', .74),
}
for key in ('brass', 'paper', 'tassel'):
    palette[key]['night_diffuse_lantern_part'] = True

head_objects = set(head['objects'])
wardrobe = [o for o in scene.objects if o.type == 'MESH' and o not in head_objects]
removed_degenerate_faces = []
for ob in wardrobe:
    # The legacy night flats contain coincident cap-ring triangles. Remove only
    # their proven zero-area faces; retain all positions, skinning and shape.
    if any(p.area <= 1e-13 for p in ob.data.polygons):
        assert not ob.data.shape_keys, 'Degenerate morph geometry needs dedicated repair: ' + ob.name
        bad_indices = [p.index for p in ob.data.polygons if p.area <= 1e-13]
        bm = bmesh.new(); bm.from_mesh(ob.data); bm.faces.ensure_lookup_table()
        degenerate = [bm.faces[i] for i in bad_indices]
        removed_degenerate_faces.append({'mesh': ob.name, 'count': len(degenerate)})
        bmesh.ops.delete(bm, geom=degenerate, context='FACES_ONLY')
        bm.to_mesh(ob.data); bm.free(); ob.data.update()
    original = [m.name.lower() if m else '' for m in ob.data.materials]
    slots = []
    n = ob.name.lower()
    for name in original:
        if args.night:
            if 'lantern' in n:
                selected = palette['paper' if 'paper' in name else 'tassel' if 'tassel' in name else 'brass']
            elif 'shoe' in n:
                selected = palette['sole'] if 'sole' in name else palette['night_shoes']
            elif any(word in n for word in ('leg under', 'shoulder arm', 'finger', 'thumb')):
                selected = skin
            elif 'qipao' in n:
                selected = palette['silk_lining'] if 'interior' in name else palette['silk']
            else:
                raise ValueError('Unclassified night mesh: ' + ob.name)
        else:
            if 'palms' in n or 'wrist and palm' in n:
                selected = skin
            elif 'blouse' in n:
                selected = palette['blouse']
            elif 'trouser' in n:
                selected = palette['trousers']
            elif 'button' in n:
                selected = palette['buttons']
            elif 'buckle' in n:
                selected = palette['buckles']
            elif 'loafer' in n:
                selected = palette['sole'] if 'sole' in name else palette['shoes']
            elif 'cuff' in n or 'lapel' in n:
                selected = palette['cuff']
            else:
                selected = palette['lining'] if 'lining' in name else palette['coat']
        slots.append(selected)
    assert slots, 'Unassigned material: ' + ob.name
    unique, remap = [], []
    for mat in slots:
        if mat not in unique:
            unique.append(mat)
        remap.append(unique.index(mat))
    original_indices = [p.material_index for p in ob.data.polygons]
    ob.data.materials.clear()
    for mat in unique:
        ob.data.materials.append(mat)
    for polygon, old_index in zip(ob.data.polygons, original_indices):
        polygon.material_index = remap[old_index]
    # PBR colour is authored in material space, with no retained photo albedo,
    # painted shadows, transparent cut-outs or vertex-color overrides.
    # Removing a Blender CustomData layer invalidates cached RNA handles to
    # subsequent layers; re-resolve the collection each time.
    while ob.data.uv_layers:
        ob.data.uv_layers.remove(ob.data.uv_layers[-1])
    while ob.data.color_attributes:
        ob.data.color_attributes.remove(ob.data.color_attributes[-1])
    if 'loafer' in n:
        side='L' if 'loafer l' in n else 'R'
        anchor=rig.data.bones['Foot.'+side].head_local
        for vertex in ob.data.vertices:
            vertex.co.x=anchor.x+(vertex.co.x-anchor.x)*.80
            vertex.co.y=anchor.y+(vertex.co.y-anchor.y)*.74
    for polygon in ob.data.polygons:
        polygon.use_smooth = True
    ob['style'] = 'rounded local cartoon / volumetric cloth'


def repair_writing_train():
    """A closed rounded coat lap unfolds around tucked legs during real Write.

    Preserve rest geometry and all other clips. Real, constant-length leg IK
    tucks the feet and brings the knees together in Write only. A rounded fold
    then follows that smaller seated body, rather than covering distant heels
    with a rectangular shell.
    """
    saved = []
    for ob in scene.objects:
        blocks = [ob]
        if ob.type == 'MESH' and ob.data.shape_keys:
            blocks.append(ob.data.shape_keys)
        for block in blocks:
            ad = block.animation_data
            if ad:
                saved.append((ad, ad.action, [t.mute for t in ad.nla_tracks]))
                ad.action = None
                for track in ad.nla_tracks:
                    track.mute = True
    write = next(s.action for t in rig.animation_data.nla_tracks if t.name == 'Write' for s in t.strips)
    rig.animation_data.action = write
    rear_keys=next(o for o in wardrobe if 'trench rear' in o.name).data.shape_keys
    cloth_action=next(s.action for t in rear_keys.animation_data.nla_tracks if t.name=='Write' for s in t.strips)
    cloth_curve=next(f for f in cloth_action.fcurves if 'KneelingCloth' in f.data_path)
    lower_names=[f'{part}.{side}' for side in ('L','R') for part in ('Thigh','Shin','Foot','Toe')]
    idle=next(s.action for t in rig.animation_data.nla_tracks if t.name=='Idle' for s in t.strips)
    rig.animation_data.action=idle
    scene.frame_set(0);bpy.context.view_layer.update()
    start_quats={n:rig.pose.bones[n].rotation_quaternion.copy().normalized() for n in lower_names}
    start_ankles={s:rig.pose.bones['Foot.'+s].head.copy() for s in ('L','R')}
    start_directions={n:(rig.pose.bones[n].tail-rig.pose.bones[n].head).normalized() for n in lower_names if n.startswith(('Foot','Toe'))}
    rig.animation_data.action=write
    frame = float(write.frame_range[1])
    def aim(bone,tail):
        pivot=bone.head.copy()
        delta=(bone.tail-pivot).normalized().rotation_difference((tail-pivot).normalized())
        bone.matrix=Matrix.Translation(pivot)@delta.to_matrix().to_4x4()@Matrix.Translation(-pivot)@bone.matrix
        bpy.context.view_layer.update()
    def leg_ik(side,ankle,foot_direction,toe_direction):
        thigh,shin=rig.pose.bones['Thigh.'+side],rig.pose.bones['Shin.'+side]
        hip=thigh.head.copy();direction=ankle-hip;distance=direction.length;direction/=distance
        assert distance < thigh.bone.length+shin.bone.length, 'Write foot target beyond true limb reach'
        a=(thigh.bone.length**2-shin.bone.length**2+distance**2)/(2*distance)
        height=math.sqrt(max(0,thigh.bone.length**2-a*a))
        forward=Vector((0,-1,-.5));normal=(forward-direction*forward.dot(direction)).normalized()
        knee=hip+direction*a+normal*height
        aim(thigh,knee);aim(shin,ankle)
        foot=rig.pose.bones['Foot.'+side]
        aim(foot,foot.head+foot_direction*foot.bone.length)
        toe=rig.pose.bones['Toe.'+side]
        aim(toe,toe.head+toe_direction*toe.bone.length)
    samples=sorted({float(k.co[0]) for f in write.fcurves if 'rotation_quaternion' in f.data_path for k in f.keyframe_points})
    rotations={n:{} for n in lower_names};floor_samples=[]
    for sample in samples:
        scene.frame_set(int(sample),subframe=sample-int(sample));bpy.context.view_layer.update()
        blend=max(0,min(1,cloth_curve.evaluate(sample)))
        for side,x in (('L',-.11),('R',.11)):
            if blend<1e-6:
                for n in lower_names:
                    if n.endswith('.'+side):rotations[n][sample]=start_quats[n].copy()
                continue
            ankle=start_ankles[side].lerp(Vector((x,.195,.212)),blend)
            dirs=[]
            for part,goal in [('Foot',Vector((0,.035,-.146)).normalized()),('Toe',Vector((0,.148,-.027)).normalized())]:
                initial=start_directions[part+'.'+side]
                delta=Quaternion().slerp(initial.rotation_difference(goal),blend)
                dirs.append((delta@initial).normalized())
            shoe=next(o for o in wardrobe if 'loafer '+side in o.name)
            # The foot remains a real constant-length chain. During the crouch
            # its ankle rises only as much as the rotating shoe needs to avoid
            # passing through the seat/ground plane.
            seat_blend=max(0,min(1,(blend-.90)/.10));seat_blend=seat_blend*seat_blend*(3-2*seat_blend)
            floor_target=.007+.044*seat_blend
            for _ in range(4):
                leg_ik(side,ankle,*dirs)
                ev=shoe.evaluated_get(bpy.context.evaluated_depsgraph_get())
                low=min((ev.matrix_world@v.co).z for v in ev.data.vertices)
                if abs(low-floor_target)<.0005:break
                ankle.z+=floor_target-low
            floor_samples.append(low)
            for n in lower_names:
                if n.endswith('.'+side):rotations[n][sample]=rig.pose.bones[n].rotation_quaternion.copy().normalized()
    # Store continuous quaternion signs, then update Write only. No bone is
    # shortened, scaled or translated independently from its connected chain.
    for name in lower_names:
        previous=start_quats[name]
        for sample in samples:
            q=rotations[name][sample]
            if q.dot(previous)<0:q.negate()
            previous=q
        path=f'pose.bones["{name}"].rotation_quaternion'
        for curve in (f for f in write.fcurves if f.data_path==path):
            for point in curve.keyframe_points:
                point.co[1]=rotations[name][float(point.co[0])][curve.array_index]
                point.interpolation='LINEAR'
            curve.update()
    scene.frame_set(int(frame),subframe=frame-int(frame));bpy.context.view_layer.update()
    inverse = (rig.pose.bones['Hips'].matrix @ rig.data.bones['Hips'].matrix_local.inverted()).inverted()
    profile = [(0,.690,.001,.001,.000),(.08,.640,.14,.09,.000),
               (.18,.565,.20,.155,.015),(.42,.40,.25,.30,.040),
               (.68,.24,.27,.385,.045),(.83,.10,.275,.382,.050),
               (.94,.030,.274,.378,.050),(.98,.013,.238,.334,.050),
               (1,.009,0,0,.050)]
    def values(t):
        for a,b in zip(profile,profile[1:]):
            if a[0] <= t <= b[0]:
                u=(t-a[0])/(b[0]-a[0]);u=u*u*(3-2*u)
                return tuple(x+(y-x)*u for x,y in zip(a[1:],b[1:]))
        return profile[-1][1:]
    radial=64 if args.quality=='high' else 40
    rings=32 if args.quality=='high' else 24
    base=[Vector((0,0,1.085))];target=[inverse @ Vector((0,0,.69))];faces=[]
    for i in range(1,rings):
        phi=math.pi*i/rings;t=(1-math.cos(phi))/2
        z,rx,ry,cy=values(t);cx=0
        exponent=1
        for j in range(radial):
            theta=math.tau*j/radial
            sn,cs=math.sin(theta),math.cos(theta)
            base.append(Vector((.105*math.sin(phi)*sn,.059*math.sin(phi)*cs,1.03+.055*math.cos(phi))))
            x=cx+rx*math.copysign(abs(sn)**exponent,sn)
            y=cy+ry*math.copysign(abs(cs)**exponent,cs)
            # Broad tiny folds, not a flat cube or a jagged cloth outline.
            z+=.003*math.sin(5*theta+t*2)*math.sin(math.pi*t)**2
            target.append(inverse @ Vector((x,y,z)))
    bottom=len(base);base.append(Vector((0,0,.975)));target.append(inverse @ Vector((0,.050,.009)))
    for j in range(radial):
        faces.append((0,1+j,1+(j+1)%radial))
        k=1+(rings-2)*radial
        faces.append((bottom,k+(j+1)%radial,k+j))
    for i in range(rings-2):
        for j in range(radial):
            a=1+i*radial+j;b=1+i*radial+(j+1)%radial
            faces.append((a,b,b+radial,a+radial))
    mesh=bpy.data.meshes.new('Continuous folded coat lap')
    mesh.from_pydata(base,[],faces);mesh.materials.append(palette['coat']);mesh.update()
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    for polygon in mesh.polygons:polygon.use_smooth=True
    ob=bpy.data.objects.new('Hanjing / closed rounded kneeling coat lap',mesh);scene.collection.objects.link(ob)
    group=ob.vertex_groups.new(name='Hips');group.add(list(range(len(base))),1,'REPLACE')
    mod=ob.modifiers.new('Actual preserved Hanjing skeleton','ARMATURE');mod.object=rig
    ob.parent=rig;ob.matrix_parent_inverse=rig.matrix_world.inverted()
    ob.shape_key_add(name='Basis');key=ob.shape_key_add(name='KneelingCloth')
    for point,co in zip(key.data,target):point.co=co
    # This is a real geometric enclosure check at the held posture, independent
    # of shadows or opaque-looking material. It supports visual review rather
    # than replacing front/back/profile and transition captures.
    mesh.calc_loop_triangles()
    hips_matrix=inverse.inverted()
    shell_points=[hips_matrix@point.co for point in key.data]
    shell=BVHTree.FromPolygons(shell_points,[tuple(t.vertices)for t in mesh.loop_triangles],all_triangles=True)
    outside=0;tested=0;max_penetration=0
    for garment in wardrobe:
        if not any(word in garment.name.lower()for word in ('loafer','trouser')):continue
        ev=garment.evaluated_get(bpy.context.evaluated_depsgraph_get())
        for vertex in ev.data.vertices:
            posed=ev.matrix_world@vertex.co
            if posed.z>.44:continue
            closest,normal,index,distance=shell.find_nearest(posed)
            signed=(posed-closest).dot(normal);tested+=1
            if signed>.0007:outside+=1;max_penetration=max(max_penetration,distance)
    assert outside==0, f'Write lower garments penetrate closed coat lap: {outside} points / {max_penetration:.5f}m'
    # Fold the source front/rear panels into the same lap. They remain real
    # connected meshes, just inside its lower surface, avoiding broad flared
    # tails or coincident exterior triangles during the held writing pose.
    changed_panels=0
    def contour_at_z(z):
        for a,b in zip(profile,profile[1:]):
            if b[1] <= z <= a[1] and a[1]-b[1]>1e-6:
                u=(a[1]-z)/(a[1]-b[1]);u=u*u*(3-2*u)
                return tuple(v+(w-v)*u for v,w in zip(a[2:],b[2:]))
        return (.278,.385,.05)
    for panel in wardrobe:
        if not panel.data.shape_keys:continue
        fold=panel.data.shape_keys.key_blocks.get('KneelingCloth')
        if not fold:continue
        for vertex,point in zip(panel.data.vertices,fold.data):
            skin_matrix=Matrix(((0,0,0,0),)*4)
            for group in vertex.groups:
                name=panel.vertex_groups[group.group].name
                if name in rig.pose.bones:
                    bone=rig.pose.bones[name]
                    matrix=bone.matrix@bone.bone.matrix_local.inverted()
                    for i in range(4):
                        for j in range(4):skin_matrix[i][j]+=group.weight*matrix[i][j]
            posed=skin_matrix@point.co
            if posed.z>.57:continue
            rx,ry,cy=contour_at_z(posed.z)
            radius=math.hypot(posed.x/rx,(posed.y-cy)/ry)
            if radius>.965:
                posed.x*=.965/radius;posed.y=cy+(posed.y-cy)*.965/radius
                point.co=skin_matrix.inverted()@posed;changed_panels+=1
    original=next(o for o in wardrobe if 'trench rear' in o.name).data.shape_keys.animation_data
    ad=ob.data.shape_keys.animation_data_create()
    for track in original.nla_tracks:
        nt=ad.nla_tracks.new();nt.name=track.name
        for strip in track.strips:
            ns=nt.strips.new(strip.name,int(strip.frame_start),strip.action)
            ns.action_frame_start,ns.action_frame_end=strip.action_frame_start,strip.action_frame_end
    for old,action,mute in saved:
        old.action=action
        for track,was_muted in zip(old.nla_tracks,mute):track.mute=was_muted
    scene.frame_set(0);bpy.context.view_layer.update()
    ob['writing_rear_coverage']='Real closed soft coat lap around folded legs; legs remain present'
    return {'closed_lap_vertices':len(base),'standing_wardrobe_unchanged':True,
            'rest_bones_and_other_eight_clips_unchanged':True,'real_legs_retained':True,
            'write_only_tucked_leg_ik':True,'write_modified_bones':lower_names,
            'write_sampled_shoe_floor_min_m':min(floor_samples),
            'held_lower_garment_enclosure':{'tested_vertices_below_0_44m':tested,'outside_vertices':outside,'maximum_penetration_m':max_penetration},
            'folded_panel_vertices':changed_panels,
            'held_width_m':.556,'held_back_extent_m':.435,
            'method':'Constant-length real Write leg IK, smoothly folded elliptical coat lap, Hips inverse bind'}


writing_coverage = None if args.night else repair_writing_train()



def body_weights(point):
    z=point.z
    if z<1.07:return {'Hips':1}
    if z<1.23:
        t=(z-1.07)/.16;return {'Hips':1-t,'Spine':t}
    if z<1.39:
        t=(z-1.23)/.16;return {'Spine':1-t,'Chest':t}
    return {'Chest':1}


def rig_mesh(ob,weights):
    groups={}
    for vertex in ob.data.vertices:
        values=weights(vertex.co)
        for name,w in values.items():
            if w>.000001:
                if name not in groups:groups[name]=ob.vertex_groups.new(name=name)
                groups[name].add([vertex.index],w,'REPLACE')
    mod=ob.modifiers.new('Established real character skeleton','ARMATURE');mod.object=rig
    ob.parent=rig;ob.matrix_parent_inverse=rig.matrix_world.inverted()
    return ob


def round_mesh(name,verts,faces,mat,weights):
    mesh=bpy.data.meshes.new(name+' geometry');mesh.from_pydata(verts,[],faces);mesh.update()
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    if bm.calc_volume(signed=True)<0:bmesh.ops.reverse_faces(bm,faces=list(bm.faces))
    bm.to_mesh(mesh);bm.free();mesh.materials.append(mat)
    for polygon in mesh.polygons:polygon.use_smooth=True
    ob=bpy.data.objects.new(name,mesh);scene.collection.objects.link(ob)
    return rig_mesh(ob,weights)


def oval(name,centre,radii,mat,weights,rotation=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32 if args.quality=='high' else 24,ring_count=16 if args.quality=='high' else 12,radius=1)
    ob=bpy.context.object;ob.name=name
    for vertex in ob.data.vertices:
        co=Vector([vertex.co[i]*radii[i]for i in range(3)])
        vertex.co=(rotation@co if rotation else co)+Vector(centre)
    ob.data.materials.append(mat)
    while ob.data.uv_layers:ob.data.uv_layers.remove(ob.data.uv_layers[-1])
    for p in ob.data.polygons:p.use_smooth=True
    return rig_mesh(ob,weights)


def rounded_loft(name,profile,mat,weights):
    radial=48 if args.quality=='high' else 32;steps=48 if args.quality=='high' else 32
    verts=[Vector((0,profile[0][3],profile[0][0]))];faces=[]
    for i in range(1,steps):
        z=profile[0][0]+(profile[-1][0]-profile[0][0])*i/steps
        for a,b in zip(profile,profile[1:]):
            if b[0]<=z<=a[0]:
                t=(a[0]-z)/(a[0]-b[0]);t=t*t*(3-2*t)
                rx,ry,cy=[v+(w-v)*t for v,w in zip(a[1:],b[1:])];break
        for j in range(radial):
            theta=math.tau*j/radial
            verts.append(Vector((rx*math.sin(theta),cy+ry*math.cos(theta),z)))
    bottom=len(verts);verts.append(Vector((0,profile[-1][3],profile[-1][0])))
    for j in range(radial):
        faces.append((0,1+j,1+(j+1)%radial));k=1+(steps-2)*radial
        faces.append((bottom,k+(j+1)%radial,k+j))
    for i in range(steps-2):
        for j in range(radial):
            a=1+i*radial+j;b=1+i*radial+(j+1)%radial
            faces.append((a,b,b+radial,a+radial))
    return round_mesh(name,verts,faces,mat,weights)


def rounded_sleeve(side):
    upper=rig.data.bones['UpperArm.'+side];fore=rig.data.bones['Forearm.'+side]
    a,b,c=upper.head_local.copy(),fore.head_local.copy(),fore.tail_local.copy()
    length1=(b-a).length;length2=(c-b).length;total=length1+length2
    steps=40 if args.quality=='high' else 28;radial=24 if args.quality=='high' else 16
    verts=[a-(b-a).normalized()*.035];faces=[];distances=[-.035]
    for i in range(1,steps):
        distance=total*i/steps
        if distance<=length1:centre=a+(b-a)*distance/length1;tangent=(b-a).normalized()
        else:centre=b+(c-b)*(distance-length1)/length2;tangent=(c-b).normalized()
        if abs(distance-length1)<.040:
            t=(distance-length1+.040)/.080
            start=b-(b-a).normalized()*.040;end=b+(c-b).normalized()*.040
            centre=start*(1-t)**2+b*(2*t*(1-t))+end*t*t
            tangent=((b-start)*(1-t)+(end-b)*t).normalized()
        front=Vector((0,-1,0));along=tangent.cross(front).normalized();depth=tangent.cross(along).normalized()
        t=distance/total
        radius=(.078*(1-t)+.052*t)*min(1,math.sin(math.pi*t)**.22*1.5)
        for j in range(radial):
            theta=math.tau*j/radial;verts.append(centre+along*radius*math.cos(theta)+depth*radius*math.sin(theta));distances.append(distance)
    bottom=len(verts);verts.append(c+(c-b).normalized()*.018);distances.append(total+.018)
    for j in range(radial):
        faces.append((0,1+j,1+(j+1)%radial));k=1+(steps-2)*radial;faces.append((bottom,k+(j+1)%radial,k+j))
    for i in range(steps-2):
        for j in range(radial):
            u=1+i*radial+j;v=1+i*radial+(j+1)%radial;faces.append((u,v,v+radial,u+radial))
    def weights(p):
        s=max(0,min(1,((p-a).dot((b-a).normalized())-length1+.055)/.11));s=s*s*(3-2*s)
        return {'UpperArm.'+side:1-s,'Forearm.'+side:s}
    sleeve=round_mesh('Clay Hanjing / continuous plump sleeve '+side,verts,faces,palette['coat'],weights)
    rotation=Vector((0,0,1)).rotation_difference((c-b).normalized())
    oval('Clay Hanjing / rounded folded cuff '+side,c-(c-b).normalized()*.019,(.059,.059,.025),palette['cuff'],lambda p:{'Forearm.'+side:1},rotation)
    return sleeve


def integrate_kneeling_coat(coat):
    """Use the same closed coat in standing and kneeling, never an added shell.

    The temporary lap from the IK pass is an envelope reference only. Its held
    surface is registered to the lower half of this coat, with a continuous
    waist transition and the same real Write curve. It is deleted before export.
    """
    lap=next(o for o in scene.objects if 'closed rounded kneeling coat lap' in o.name)
    saved=[]
    for ob in scene.objects:
        blocks=[ob]
        if ob.type=='MESH' and ob.data.shape_keys:blocks.append(ob.data.shape_keys)
        for block in blocks:
            ad=block.animation_data
            if ad:
                saved.append((ad,ad.action,[t.mute for t in ad.nla_tracks]))
                ad.action=None
                for track in ad.nla_tracks:track.mute=True
    write=next(s.action for t in rig.animation_data.nla_tracks if t.name=='Write' for s in t.strips)
    rig.animation_data.action=write
    end=float(write.frame_range[1]);scene.frame_set(int(end),subframe=end-int(end));bpy.context.view_layer.update()
    hips=rig.pose.bones['Hips'].matrix@rig.data.bones['Hips'].matrix_local.inverted()
    lap.data.calc_loop_triangles()
    points=[hips@p.co for p in lap.data.shape_keys.key_blocks['KneelingCloth'].data]
    envelope=BVHTree.FromPolygons(points,[tuple(t.vertices)for t in lap.data.loop_triangles],all_triangles=True)
    coat.shape_key_add(name='Basis');fold=coat.shape_key_add(name='KneelingCloth')
    altered=0
    for vertex,point in zip(coat.data.vertices,fold.data):
        p=vertex.co
        if p.z>=1.07:continue
        # All lower-coat points are Hips weighted. The lower hem follows the
        # folded knees to the bearing plane instead of floating above the legs.
        skin=hips;posed=skin@p
        t=max(0,min(1,(1.07-p.z)/(1.07-.628)))
        target_z=posed.z-.129*t**1.25
        if p.x*p.x+(p.y-.003)**2<1e-9:
            target=Vector((0,.05,.009))
        else:
            theta=math.atan2(p.x/.21,(p.y-.003)/.13)
            direction=Vector((math.sin(theta),math.cos(theta),0))
            centre=Vector((0,.05*(1-max(0,min(1,target_z/.69))),target_z))
            hit,normal,index,distance=envelope.ray_cast(centre+direction*1.1,-direction,2.2)
            assert hit is not None, f'Closed kneeling contour misses coat at {p} / {target_z}'
            blend=max(0,min(1,(1.07-p.z)/.105));blend=blend*blend*(3-2*blend)
            target=posed.lerp(hit,blend)
        point.co=skin.inverted()@target;altered+=1
    old=lap.data.shape_keys.animation_data;ad=coat.data.shape_keys.animation_data_create()
    for track in old.nla_tracks:
        nt=ad.nla_tracks.new();nt.name=track.name
        for strip in track.strips:
            ns=nt.strips.new(strip.name,int(strip.frame_start),strip.action)
            ns.action_frame_start,ns.action_frame_end=strip.action_frame_start,strip.action_frame_end
    # Validate the actual closed outer coat, not the soon-to-be-removed guide.
    coat.data.calc_loop_triangles()
    shell_points=[]
    for vertex,point in zip(coat.data.vertices,fold.data):
        matrix=Matrix(((0,0,0,0),)*4)
        for group in vertex.groups:
            bone=rig.pose.bones[coat.vertex_groups[group.group].name]
            transform=bone.matrix@bone.bone.matrix_local.inverted()
            for i in range(4):
                for j in range(4):matrix[i][j]+=group.weight*transform[i][j]
        shell_points.append(matrix@point.co)
    shell=BVHTree.FromPolygons(shell_points,[tuple(t.vertices)for t in coat.data.loop_triangles],all_triangles=True)
    tested=outside=0;penetration=0
    for garment in wardrobe:
        if not any(word in garment.name.lower()for word in ('loafer','trouser')):continue
        ev=garment.evaluated_get(bpy.context.evaluated_depsgraph_get())
        for vertex in ev.data.vertices:
            posed=ev.matrix_world@vertex.co
            if posed.z>.44:continue
            closest,normal,index,distance=shell.find_nearest(posed);tested+=1
            if (posed-closest).dot(normal)>.0007:outside+=1;penetration=max(penetration,distance)
    assert outside==0, f'Write garments penetrate the single continuous coat: {outside} / {penetration}'
    for original,action,mutes in saved:
        original.action=action
        for track,mute in zip(original.nla_tracks,mutes):track.mute=mute
    bpy.data.objects.remove(lap,do_unlink=True)
    scene.frame_set(0);bpy.context.view_layer.update()
    coat['writing_rear_coverage']='Single closed standing coat morphs continuously around folded legs; no separate shell'
    writing_coverage.update({'single_continuous_coat':True,'temporary_envelope_removed':True,
       'coat_morph_vertices':altered,'held_lower_garment_enclosure':{'tested_vertices_below_0_44m':tested,'outside_vertices':outside,'maximum_penetration_m':penetration},
       'method':'True constant-length Write IK and one closed coat with continuous KneelingCloth morph'})


def add_shoulder_roots(mat):
    """A true soft clavicle volume joins each sleeve/arm to the torso.

    Source upper-arm pivots are at 1.525 m. The old narrow neck-to-chest loft
    left air between the shoulder cap and torso. These closed rounded yokes
    reach both bodies and follow Chest/Clavicle, not a view-facing cover.
    """
    for side,sign in (('L',-1),('R',1)):
        oval('Clay Hanjing / real rounded shoulder root '+side,
             (sign*.162,-.014,1.493),(.095,.089,.060),mat,
             lambda p,s=side:{'Chest':.65,'Clavicle.'+s:.35})


def build_clay_wardrobe():
    if not args.night:
        retained=[]
        for ob in wardrobe:
            if any(k in ob.name.lower()for k in ('trouser','palm','loafer')):retained.append(ob)
            else:bpy.data.objects.remove(ob,do_unlink=True)
        wardrobe[:]=retained
        coat=rounded_loft('Clay Hanjing / soft rounded little trench coat',
            [(1.545,0,0,.006),(1.515,.056,.05,.006),(1.46,.174,.107,.006),
             (1.40,.219,.124,.005),(1.28,.209,.125,.002),(1.12,.191,.117,0),
             (.95,.204,.132,0),(.78,.241,.149,.002),(.67,.239,.148,.003),
             (.635,.205,.13,.003),(.628,0,0,.003)],palette['coat'],body_weights)
        integrate_kneeling_coat(coat)
        add_shoulder_roots(palette['coat'])
        for side in ('L','R'):rounded_sleeve(side)
        oval('Clay Hanjing / shallow curved ivory collar L',(-.047,-.109,1.470),(.050,.019,.025),palette['blouse'],lambda p:{'Chest':1},Quaternion(Vector((0,1,0)),-.35))
        oval('Clay Hanjing / shallow curved ivory collar R',(.047,-.109,1.470),(.050,.019,.025),palette['blouse'],lambda p:{'Chest':1},Quaternion(Vector((0,1,0)),.35))
        for z in (1.29,1.15):
            for x in (-.051,.051):
                oval('Clay Hanjing / small rounded coat button',(x,-.130,z),(.013,.009,.013),palette['buttons'],body_weights)
        return {'whole_body_style':'closed rounded little trench + continuous soft sleeves + small curved collar',
                'photo_projection':False,'rig_rest_changed':False,'head_to_height_ratio':'about 1:5','old_rigid_lapels_removed':True}
    # Rebuild the full qipao as one soft closed curved dress. The established
    # cloth skin weights and motion delta transfer barycentrically from source;
    # no flat silhouette, photograph or replacement gait is introduced.
    source=next(o for o in wardrobe if 'qipao' in o.name.lower());source.data.calc_loop_triangles()
    triangles=[tuple(t.vertices)for t in source.data.loop_triangles]
    coords=[v.co.copy()for v in source.data.vertices];tree=BVHTree.FromPolygons(coords,triangles,all_triangles=True)
    register=[]
    def dress_weights(p):
        hit,normal,index,distance=tree.find_nearest(p)
        ids=triangles[index];uvw=barycentric_transform(hit,*[coords[i]for i in ids],Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1)))
        values={}
        for idx,factor in zip(ids,uvw):
            for group in source.data.vertices[idx].groups:
                name=source.vertex_groups[group.group].name;values[name]=values.get(name,0)+group.weight*factor
        total=sum(values.values());return {n:w/total for n,w in values.items()if w>1e-8}
    dress=rounded_loft('Clay Hanjing / continuous rounded midnight qipao',
       [(1.544,0,0,.008),(1.519,.055,.047,.008),(1.46,.19,.107,.007),
        (1.385,.214,.125,.006),(1.24,.199,.123,.003),(1.10,.181,.113,.002),
        (.985,.220,.135,.001),(.80,.231,.142,0),(.57,.210,.14,0),
        (.28,.205,.135,0),(.10,.199,.133,0),(.062,.177,.12,0),(.055,0,0,0)],palette['silk'],dress_weights)
    if source.data.shape_keys:
        dress.shape_key_add(name='Basis')
        for key in list(source.data.shape_keys.key_blocks)[1:]:
            added=dress.shape_key_add(name=key.name)
            for v,p in zip(dress.data.vertices,added.data):
                hit,normal,index,distance=tree.find_nearest(v.co);ids=triangles[index]
                shifted=barycentric_transform(hit,*[coords[i]for i in ids],*[key.data[i].co for i in ids]);p.co=v.co+shifted-hit
        old=source.data.shape_keys.animation_data
        if old:
            ad=dress.data.shape_keys.animation_data_create()
            for track in old.nla_tracks:
                nt=ad.nla_tracks.new();nt.name=track.name
                for strip in track.strips:
                    ns=nt.strips.new(strip.name,int(strip.frame_start),strip.action);ns.action_frame_start=strip.action_frame_start;ns.action_frame_end=strip.action_frame_end
    wardrobe.remove(source);bpy.data.objects.remove(source,do_unlink=True)
    wardrobe.append(dress)
    add_shoulder_roots(palette['silk'])
    return {'whole_body_style':'closed soft clay qipao; registered cloth weighting and real night gait',
            'photo_projection':False,'rig_rest_changed':False,'head_to_height_ratio':'about 1:5','new_qipao':dress.name}


clay_wardrobe=build_clay_wardrobe()

def add_qipao_embroidery(dress):
    """Raised bamboo thread follows both skinning and the exact dress morph.

    Each authored thread vertex is barycentrically registered to a real dress
    triangle, so it cannot remain a floating rigid sticker during Walk/Write.
    """
    verts = [v.co.copy() for v in dress.data.vertices]
    dress.data.calc_loop_triangles()
    faces = [tuple(t.vertices) for t in dress.data.loop_triangles]
    bvh = BVHTree.FromPolygons(verts, faces, all_triangles=True)
    decorated, triangles, bindings = [], [], []

    def projection(x, z, offset=.0013):
        hit, normal, face_index, _ = bvh.ray_cast(Vector((x, -.6, z)), Vector((0, 1, 0)))
        if hit is None:
            raise ValueError(f'Bamboo embroidery misses dress at {x}, {z}')
        ids = faces[face_index]
        bary = barycentric_transform(hit, *(verts[i] for i in ids),
                                     Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))
        return hit + normal * offset, ids, tuple(bary), normal

    def patch(path, width):
        base = len(decorated)
        for j, (x, z) in enumerate(path):
            before, after = path[max(0, j-1)], path[min(len(path)-1, j+1)]
            tangent = Vector((after[0]-before[0], after[1]-before[1])).normalized()
            across = Vector((-tangent.y, tangent.x))
            # A tiny rounded stitch-tip avoids coincident endpoint vertices.
            w = .00025 + width * math.sin(math.pi * j / (len(path)-1)) ** .6
            for sign in (-1, 1):
                p, ids, bary, normal = projection(x + sign*across.x*w, z + sign*across.y*w)
                decorated.append(p)
                bindings.append((ids, bary, normal))
        for j in range(len(path)-1):
            a = base + j*2
            triangles.extend(((a, a+1, a+3), (a, a+3, a+2)))

    # Two slender bamboo branches, rather than an all-over gold printed panel.
    for cx, startz, length, tilt in ((-.082, .55, .51, .09), (.075, 1.075, .29, -.055)):
        stem = [(cx + tilt*t, startz + length*t) for t in [i/24 for i in range(25)]]
        patch(stem, .0016)
        for j, frac in enumerate((.17, .35, .52, .68, .83)):
            rootx, rootz = cx + tilt*frac, startz + length*frac
            sign = -1 if j % 2 else 1
            for reach, rise in ((.060, .037), (.049, .074)):
                leaf = [(rootx + sign*reach*t, rootz + rise*t + .007*math.sin(math.pi*t))
                        for t in [i/9 for i in range(10)]]
                patch(leaf, .008 if length > .4 else .006)

    mesh = bpy.data.meshes.new('Golden bamboo stitched volumes')
    mesh.from_pydata(decorated, [], triangles)
    mesh.materials.append(palette['gold'])
    mesh.update()
    ob = bpy.data.objects.new('Hanjing / gold bamboo embroidery following silk', mesh)
    scene.collection.objects.link(ob)
    groups = {g.name: ob.vertex_groups.new(name=g.name) for g in dress.vertex_groups}
    for i, (ids, bary, _) in enumerate(bindings):
        w = {}
        for v_id, frac in zip(ids, bary):
            for g in dress.data.vertices[v_id].groups:
                name = dress.vertex_groups[g.group].name
                w[name] = w.get(name, 0) + g.weight * frac
        total = sum(w.values())
        for name, weight in w.items():
            if weight > .00001:
                groups[name].add([i], weight/total, 'REPLACE')
    mod = ob.modifiers.new('Same Hanjing skeleton as silk', 'ARMATURE')
    mod.object = rig
    if dress.data.shape_keys:
        ob.shape_key_add(name='Basis')
        for key in list(dress.data.shape_keys.key_blocks)[1:]:
            new = ob.shape_key_add(name=key.name)
            for i, (ids, bary, _) in enumerate(bindings):
                delta = sum(((key.data[v].co - verts[v])*f for v, f in zip(ids, bary)), Vector())
                new.data[i].co += delta
        # Same named NLA clips and morph paths, evaluated with the same rig time.
        old = dress.data.shape_keys.animation_data
        if old:
            new = ob.data.shape_keys.animation_data_create()
            for track in old.nla_tracks:
                nt = new.nla_tracks.new(); nt.name = track.name
                for strip in track.strips:
                    ns = nt.strips.new(strip.name, int(strip.frame_start), strip.action)
                    ns.action_frame_start, ns.action_frame_end = strip.action_frame_start, strip.action_frame_end
    for p in mesh.polygons:
        p.use_smooth = True
    ob['style'] = 'real registered bamboo stitches / no projected portrait texture'
    return ob


if args.night:
    dress = next(o for o in wardrobe if 'qipao' in o.name.lower())
    add_qipao_embroidery(dress)

rig['style'] = 'locally authored rounded cartoon'
rig['height_m'] = 1.92
rig['wardrobe_only'] = False
rig['model_set'] = 'local-stylized-v1'
rig['source_model_sha256'] = source_hash
rig['writing_hand_bone'] = 'Hand.L'
rig['generation_provider'] = 'local Blender; no external paid model generation'
rig['head_owner'] = 'local rounded head helper'
rig['reference'] = 'User portrait and existing outfits guide local cartoon shape; no projected photo albedo'
rig['fidelity_limit'] = 'Simplified cartoon character. Actual front/profile likeness and motion remain visual review gates.'
if 'gaitStride' in rig:
    rig['walk_stride_source_m'] = rig['gaitStride']['cycleLength']
    rig['walk_cycle_seconds'] = rig['gaitStride']['cycleSeconds']

# Imported GLTF stores each clip in a muted NLA track plus one active preview
# action. Export only the named independent tracks, not that duplicate preview.
for ob in scene.objects:
    blocks = [ob]
    if ob.type == 'MESH' and ob.data.shape_keys:
        blocks.append(ob.data.shape_keys)
    for block in blocks:
        ad = block.animation_data
        if ad and ad.nla_tracks:
            ad.action = None
            for track in ad.nla_tracks:
                track.mute = False

exported = [o for o in scene.objects if o.type in ('MESH', 'ARMATURE', 'EMPTY')]
for ob in exported:
    if ob.type != 'MESH':
        continue
    assert len(ob.data.materials) > 0, ob.name
    ob.data.calc_loop_triangles()
    for mat in ob.data.materials:
        assert not any(n.type == 'TEX_IMAGE' for n in mat.node_tree.nodes), (ob.name, mat.name)
    for vertex in ob.data.vertices:
        total = sum(g.weight for g in vertex.groups if ob.vertex_groups[g.group].name in rig.data.bones)
        assert total > .98 and total < 1.02, (ob.name, vertex.index, total)
    for polygon in ob.data.polygons:
        assert polygon.area > 1e-13, (ob.name, polygon.index, polygon.area)

bpy.ops.object.select_all(action='DESELECT')
for ob in exported:
    ob.select_set(True)
bpy.context.view_layer.objects.active = rig
scene.frame_set(0)
out = OUTDIR / (NAME + '.glb')
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', use_selection=True,
    export_animations=True, export_animation_mode='NLA_TRACKS', export_skins=True,
    export_yup=True, export_apply=False, export_extras=True, export_anim_slide_to_zero=True)
# Read back the actual export, rather than asserting that Blender settings imply
# the browser-facing contract survived export.
blob = out.read_bytes(); length, chunk = struct.unpack_from('<II', blob, 12)
assert chunk == 0x4E4F534A
asset = json.loads(blob[20:20+length])
exported_triangles = sum(asset['accessors'][p['indices']]['count'] // 3
                         for m in asset['meshes'] for p in m['primitives'])
clips = [a['name'] for a in asset.get('animations', [])]
expected = ('Idle', 'Walk') if args.night else ('Idle', 'Walk', 'Wave', 'Bow', 'Read', 'Write', 'Mail', 'Cap', 'Pet')
assert set(clips) == set(expected), clips
assert not asset.get('images') and not asset.get('textures')
report = {
    'name': NAME, 'source': str(SOURCE), 'source_sha256': source_hash,
    'builder_sha256': builder_hash, 'head_helper_sha256': helper_hash,
    'path': str(out), 'bytes': len(blob), 'sha256': hashlib.sha256(blob).hexdigest(),
    'source_rig_preserved': True, 'bone_count': len(rig.data.bones),
    'clips': clips, 'night_interaction_limit': 'Source night wardrobe contains only real Idle/Walk. Other clips are not fabricated.' if args.night else None,
    'textures': len(asset.get('textures', [])),
    'vertices': sum(len(o.data.vertices) for o in exported if o.type == 'MESH'),
    'triangles': exported_triangles,
    'removed_legacy_degenerate_faces': removed_degenerate_faces,
    'writing_rear_coverage': writing_coverage,
    'head': head['diagnostics'],
    'clay_wardrobe':clay_wardrobe,
    'mesh_count': len(asset.get('meshes', [])), 'materials': len(asset.get('materials', [])),
    'walk_stride_source_m': rig.get('walk_stride_source_m'), 'walk_cycle_seconds': rig.get('walk_cycle_seconds'),
    'writing_hand_bone': rig.get('writing_hand_bone'),
    'rest_bounds_blender': {
        'min': [min((o.matrix_world @ v.co)[i] for o in exported if o.type == 'MESH' for v in o.data.vertices) for i in range(3)],
        'max': [max((o.matrix_world @ v.co)[i] for o in exported if o.type == 'MESH' for v in o.data.vertices) for i in range(3)],
    },
    'acceptance': 'Private candidate: requires actual Three.js front/45/profile and continuous motion review.',
}
(OUTDIR / (NAME + '-intake.json')).write_text(json.dumps(report, indent=2) + '\n')
print('LOCAL_STYLIZED_EXPORT', json.dumps(report))
