//Created by Peter Sarkozy (mysterme@gmail.com)
// catmull-clarke by https://github.com/Erkaman/gl-catmull-clark
// Convenience Declarations For Dependencies.
// 'Core' Is Configured In Libraries Section.



var Conversions = Core.Conversions;
var Debug = Core.Debug;
var Path2D = Core.Path2D;
var Point2D = Core.Point2D;
var Point3D = Core.Point3D;
var Matrix2D = Core.Matrix2D;
var Matrix3D = Core.Matrix3D;
var Mesh3D = Core.Mesh3D;
var Plugin = Core.Plugin;
var Tess = Core.Tess;
var Sketch2D = Core.Sketch2D;
var Solid = Core.Solid;
var Vector2D = Core.Vector2D; 
var Vector3D = Core.Vector3D;


	params = [

		{ "id": "height", "displayName": "Height", "type": "length", "rangeMin": 1.0, "rangeMax": 100.0, "default": 50.0 },
		{ "id": "width" , "displayName": "Width" , "type": "length", "rangeMin": 1.0, "rangeMax": 100.0, "default": 50.0 },
		{ "id": "depth" , "displayName": "Depth" , "type": "length", "rangeMin": 1.0, "rangeMax": 50.0, "default": 8.0	},
		{ "id": "grout" , "displayName": "Grout to Brick Ratio" , "type": "float" , "rangeMin": 0.0, "rangeMax": 1.0 , "default": 0.1	},
		
		{ "id": "rows"		, "displayName": "Rows"	 , "type": "int", "rangeMin": 1, "rangeMax": 40, "default": 5 },
		{ "id": "columns" , "displayName": "Columns", "type": "int", "rangeMin": 1, "rangeMax": 80, "default": 3	},
		{ "id": "depthnoise" , "displayName": "Depth Noise" , "type": "float" , "rangeMin": 0.0, "rangeMax": 1.0 , "default": 0.05	}, // this should somehow be scale invariant?
		{ "id": "placenoise" , "displayName": "Placement Noise" , "type": "float" , "rangeMin": 0.0, "rangeMax": 0.25 , "default": 0.05	}, // this should somehow be scale invariant?
		{ "id": "sizenoise" , "displayName": "Size Noise" , "type": "float" , "rangeMin": 0.0, "rangeMax": 0.5 , "default": 0.05	}, // this should somehow be scale invariant?
		{ "id": "shapenoise" , "displayName": "Shape Noise" , "type": "float" , "rangeMin": 0.0, "rangeMax": 0.2 , "default": 0.02	}, // this should somehow be scale invariant?
      
		{"id": "offsetrows",	"displayName": "Offset Rows", "type": "bool", "default": true},
        {"id": "offseteven",	"displayName": "Offset Even", "type": "bool", "default": true},
        {"id": "smallleft",	"displayName": "Small bricks on left", "type": "bool", "default": true},
      
        {"id": "smallright",	"displayName": "Small bricks on right", "type": "bool", "default": true},
      
		{ "id": "smoothsubdiv" , "displayName": "Smooth subdivisons (slow)", "type": "int", "rangeMin": 0, "rangeMax": 4, "default": 2	},
		{ "id": "hardsubdiv" , "displayName": "Hard subdivisoins", "type": "int", "rangeMin": 0, "rangeMax": 3, "default": 1	}
		
		
	];


	function process(params) {
				
				//var vec3 = require('gl-vec3');
		//var Set = require('es6-set');
		//var quadsToTris = require('gl-quads-to-tris');


		/*
		 Example:
		 Given [0,4] return [0,4]
		 Givem [2,1] return [1,2
		 */
		function _sort(edge) {
			return edge[0] < edge[1] ? edge : [edge[1], edge[0]];
		}
		// out = a + b*s
		function _mad(out, a, b, s) {
			out[0] = a[0] + s * b[0];
			out[1] = a[1] + s * b[1];
			out[2] = a[2] + s * b[2];
			return out;
		}
		
		// fromValues
		function vec3_fromValues(a,b,c) {
			return [a,b,c];
		}

		// out = a + b*s
		function vec3_add(out, a,b) {
			return _mad(out,a,b,1.0);
		}
		
		// out = a + b*s
		function vec3_scale(out, i, s) {
			out[0] = i[0]*s;
			out[1] = i[1]*s;
			out[2] = i[2]*s;
			return out;
		}
		
		
		/*
		Implement Catmull-Clark subvision, as it is described on Wikipedia
		 */
		function _catmullClark(positions, cells, hard ) { //positions are an array of vertex positions (L3), cells are an array of face
			if (dbg) Debug.log("Starting CC #pos:" + positions.length + " #cells:" +  cells.length+ " hard ="+hard);
			// original points, indexed by their indices.
			// For every point, we store adjacent faces and adjacent edges.
			originalPoints = [];
			// original faces, in their original order.
			// For every face, we store the edges, the points, and the face point.
			faces = [];
			// original edges. Indexed by the sorted indices of their vertices
			// So the edge whose edge vertices has index `6` and `2`, will be 
			// indexed by the array [2,6]
			edges = [];
			/*
			First we collect all the information that we need to run the algorithm.
			Each point must know its adjacent edges and faces.
			Each face must know its edges and points.
			Each edge must know its adjacent faces and points.

			We collect all this information in this loop.
			 */
			for (var iCell = 0; iCell < cells.length; ++iCell) {
				var cellPositions = cells[iCell];
				var facePoints = [];
				// initialize:
				faces[iCell] = {};
				// go through all the points of the face.
				for (var j = 0; j < cellPositions.length; ++j) {
					var positionIndex = cellPositions[j];
					var pointObject;
					/*
				   On the fly, Create an object for every point.
					 */
					if (typeof originalPoints[positionIndex] === 'undefined') {
						// create the object on the fly.
						var v = positions[positionIndex];
						var vec = vec3_fromValues(v[0], v[1], v[2]);
						pointObject = {
							point: vec,
							faces: [],
							edges: new Set()
						};
						originalPoints[positionIndex] = pointObject;
					} else {
						pointObject = originalPoints[positionIndex];
					}
					// every point should have a reference to its face.
					pointObject.faces.push(faces[iCell]);
					facePoints.push(pointObject);
				}
				// every face should know its points.
				faces[iCell].points = facePoints;
				var avg = vec3_fromValues(0, 0, 0);
				// now compute the facepoint(see Wikipedia).
				for (var i = 0; i < faces[iCell].points.length; ++i) {
					var v = faces[iCell].points[i].point;
					vec3_add(avg, v, avg);
				}
				vec3_scale(avg, avg, 1.0 / faces[iCell].points.length);
				faces[iCell].facePoint = avg;
				var faceEdges = [];

				// go through all the edges of the face.
				for (var iEdge = 0; iEdge < cellPositions.length; ++iEdge) {
					var edge;
					if (cellPositions.length == 3) { // for triangles
						if (iEdge == 0) {
							edge = [cellPositions[0], cellPositions[1]];
						} else if (iEdge == 1) {
							edge = [cellPositions[1], cellPositions[2]];
						} else if (iEdge == 2) {
							edge = [cellPositions[2], cellPositions[0]];
						}
					} else { // for quads.
						if (iEdge == 0) {
							edge = [cellPositions[0], cellPositions[1]];
						} else if (iEdge == 1) {
							edge = [cellPositions[1], cellPositions[2]];
						} else if (iEdge == 2) {
							edge = [cellPositions[2], cellPositions[3]];
						} else if (iEdge == 3) {
							edge = [cellPositions[3], cellPositions[0]];
						}
					}

					// every edge is represented by the sorted indices of its vertices.
					// (the sorting ensures that [1,2] and [2,1] are considered the same edge, which they are )
					edge = _sort(edge);

					var edgeObject;
					// on the fly, create an edge object.
					if (typeof edges[edge] === 'undefined') {
						//if (dbg) Debug.log("New edge: "+edge);
						edgeObject = {
							points: [originalPoints[edge[0]], originalPoints[edge[1]]],
							faces: []
						};
						edges[edge] = edgeObject;
					} else {
						//if (dbg) Debug.log("Duplicate edge: "+edge);
						edgeObject = edges[edge];
					}

					// every edge should know its adjacent faces.
					edgeObject.faces.push(faces[iCell]);
					// every point should know its adjacent edges.
					edgeObject.points[0].edges.add(edgeObject);
					edgeObject.points[1].edges.add(edgeObject);
					faceEdges.push(edgeObject);
				}
				// every face should know its edges.
				faces[iCell].edges = faceEdges;
			}

			if (dbg) Debug.log("Collected all info: #f:"+faces.length+" #e:"+edges.size+ " #pos"+positions.length);
			// Compute the edge points and the midpoints of every edge.
			for (key in edges) {
				var edge = edges[key];
				var avg = vec3_fromValues(0, 0, 0);
				var count = 0;

				// add face points of edge.
				if (hard == false){
					for (var i = 0; i < edge.faces.length; ++i) {
						var facePoint = edge.faces[i].facePoint;
						vec3_add(avg, facePoint, avg);
						++count;
					}
				}

				// sum together the two endpoints.
				for (var i = 0; i < edge.points.length; ++i) {
					var endPoint = edge.points[i].point;
					vec3_add(avg, endPoint, avg);
					++count;
				}

				// finally, compute edge point.
				vec3_scale(avg, avg, 1.0 / count);
				edge.edgePoint = avg;

				/*
				 Next we compute the midpoint.
				 */
				count = 0;
				var avg2 = vec3_fromValues(0, 0, 0);

				for (var i = 0; i < edge.points.length; ++i) {
					var endPoint = edge.points[i].point;
					vec3_add(avg2, endPoint, avg2);
					++count;
				}
				vec3_scale(avg2, avg2, 1.0 / count);

				edge.midPoint = avg2;
			}
			if (dbg) Debug.log("Moving all original points: #f:"+faces.length+" #e:"+edges.size+ " #pos"+positions.length);

			/*
			 Each original point is moved to the position
			 (F + 2R + (n-3)P) / n. See the wikipedia article for more details.
			 */
			 /*
			for (var i = 0; i < positions.length; ++i) {
				if (hard){
					var point = originalPoints[i];
                    var wtf = vec3_fromValues(0.0,0.0,0.0);
                    vec3_add(wtf, wtf, point.point);
					point.newPoint = wtf;
				}else{
					var point = originalPoints[i];
					var n = point.faces.length;
					var newPoint = vec3_fromValues(0, 0, 0);
					for (var j = 0; j < point.faces.length; ++j) {
						var facePoint = point.faces[j].facePoint;
						vec3_add(newPoint, newPoint, facePoint);
					}
                  
					vec3_scale(newPoint, newPoint, 1.0 / n);
					//for (var edge of point.edges) {
					for (var k = 0; k < point.edges.size; k++) {
						var edge = edges[k];
						_mad(newPoint, newPoint, edge.midPoint, 2);
					}
					_mad(newPoint, newPoint, point.point, n - 3);
					vec3_scale(newPoint, newPoint, 1.0 / n);
					point.newPoint = newPoint;
				}
			}*/
			
			for (var i = 0; i < positions.length; ++i) {
				if (hard){
					var point = originalPoints[i];
					//var wt
					point.newPoint = point.point;
				}else{
					var point = originalPoints[i];
					var n = point.faces.length;
					var Qpoint = vec3_fromValues(0, 0, 0);
					for (var j = 0; j < point.faces.length; j++) {
						var facePoint = point.faces[j].facePoint;
						vec3_add(Qpoint, Qpoint, facePoint);
					}
					vec3_scale(Qpoint, Qpoint, 1.0 / point.faces.length);
					
					var Rpoint = vec3_fromValues(0,0,0);
                    var edgearray = Array.from(point.edges); 
					//for (let edge of point.edges) {
					for (var k = 0; k < edgearray.length; k++) {
						var edge = edgearray[k];
						_mad(Rpoint, Rpoint, edge.midPoint, 2);
					}
					vec3_scale(Rpoint, Rpoint, 1.0 / point.edges.size);
					
					var newPoint = vec3_fromValues(0,0,0);
					_mad(newPoint, newPoint, point.point, Math.max(0,n - 3));
					
					vec3_add(Rpoint,Rpoint,Qpoint);
					
					vec3_add(newPoint, newPoint, Rpoint);
					
					vec3_scale(newPoint, newPoint, 1.0 / n);
					point.newPoint = newPoint;
				}
			}


			newPositions = [];
			newCells = [];

			var index = 0;

			/*
			 We create indices on the fly by using this method.
			 The index of every vertex is stored in the vertex, in a property named `index`.
			 */
			function getIndex(p) {
				if (!("index" in p)) {
					p.index = index++;
					newPositions.push([p[0], p[1], p[2]]);
				}
				return p.index;
			}

			/*
			 We go through all faces.
			 Triangle face we subdivide into 3 new quads.
			 Quad faces we subdivide into 4 new quads.

			 */
			 
			if (dbg) Debug.log("Subdividing: #f:"+faces.length+" #e:"+edges.size+ " #pos"+positions.length);
			for (var iFace = 0; iFace < faces.length; ++iFace) {

				var face = faces[iFace];

				for (var iPoint = 0; iPoint < face.points.length; ++iPoint) {
					var point = face.points[iPoint];

					var a = point.newPoint;
					var b = face.edges[(iPoint + 0) % face.edges.length].edgePoint;
					var c = face.facePoint;
					var d = face.edges[(iPoint + face.edges.length - 1) % face.edges.length].edgePoint;

					var ia = getIndex(a);
					var ib = getIndex(b);
					var ic = getIndex(c);
					var id = getIndex(d);

					newCells.push([id, ia, ib, ic]); 
				}
			}


			return {positions: newPositions, cells: newCells};

		}
		 //https://github.com/Erkaman/gl-catmull-clark 
		//positions The vertex positions of input mesh on the form [ [1.0,2.0,3.0], [3.4,1.3,4.2],...]
		//cells The indices of the input mesh. This is either a list of quad indices or a list of triangle indices. 
		//If quads, it is on the form [ [1,2,3,4], [8,9,10,11],...]. If triangles, it is on the form [ [1,2,3], [8,9,10],...].
		//And note that clockwise ordering of the indices is assumed! Finally, do note that Catmull-Clark is mostly meant
		//to be used on meshes made with quads If used on triangular meshes, the quality of the subdivision is generally not as good.
		//numSubdivisions How many times the Catmull-Clark algorithm will be run on the input mesh. The more times you run the algorithm, the smoother the output mesh will be. 
		//numHard: the first numHard subdivisions will be hard subdivs.
		//RETURNS: return {positions: newPositions, cells: newCells};

		function catmullClark(positions, cells, numSubdivisions, numHard ) {

			if (numSubdivisions < 1) {
				throw new Error("`numSubdivisions` must be a positive number!");
			}
			var obj = {positions: positions, cells: cells};
			for (var i = 0; i < numSubdivisions; ++i) {
				if (i<numHard){
					obj = _catmullClark(obj.positions, obj.cells, true);
				}else{
					obj = _catmullClark(obj.positions, obj.cells, false);
				}
			}
			return obj;
		}


		function CCtoMesh(targetmesh, obj){
			for (var iCell = 0; iCell < obj.cells.length; ++iCell) { 
				var cellPositions = obj.cells[iCell];
				targetmesh.quad(obj.positions[cellPositions[0]],obj.positions[cellPositions[1]],obj.positions[cellPositions[2]],obj.positions[cellPositions[3]]);
			}
			return targetmesh;
		}

		
		
		
		function seededrandom1D(forpoint,multiplier, scaler){
			var dot = forpoint[0]*12.9898 + forpoint[2]*78.233;
			dot = Math.sin(dot)*43758.5453;
			dot = 2* (dot - Math.floor(dot)) - 1.0;
			return dot*scaler;
			//return Math.sin( (forpoint[0] + forpoint[1] + forpoint[2])*multiplier)*scaler;
		}

		/*function seededrandom3Darr(forpoint,multiplier, scaler){
			var pt = [Math.sin( (forpoint[0] + forpoint[1] + forpoint[2])*multiplier*1.1)*scaler,
						Math.sin( (forpoint[0] + forpoint[1] + forpoint[2])*multiplier*1.2)*scaler,
						Math.sin( (forpoint[0] + forpoint[1] + forpoint[2])*multiplier*1.3)*scaler];
			return pt;
		}*/
		
		function seededrandom3Darr(forpoint, multiplier, scaler){
			var dot = forpoint[0]*12.9898 + forpoint[2]*78.233;
			var k = Math.sin(dot)*43758.5453;
			var j =	Math.sin(dot)*44758.5453;
			var l =	Math.sin(dot)*45758.5453;
			k = 2*(k - Math.floor(k)) -1.0;
			j = 2*(j - Math.floor(j)) - 1.0;
			l = 2*(l - Math.floor(l)) - 1.0;

			return [k*scaler,j*scaler,l*scaler];

				//return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453)
		}
		function seededrandom3D(forpoint,multiplier, scaler){
			return new Point3D(Math.sin( (forpoint.x + forpoint.y + forpoint.z)*multiplier*1.1)*scaler,
					Math.sin( (forpoint.x + forpoint.y + forpoint.z)*multiplier*1.1)*scaler,
					Math.sin( (forpoint.x + forpoint.y + forpoint.z)*multiplier*1.1)*scaler);
		}
		
		function pt2a(point){
			var retp = [point.x,point.y,point.z];
			return retp;
		}
		
		function addmul(a,b,m){
			return [a[0]+m*b[0],a[1]+m*b[1],a[2]+m*b[2]];
		}
		
		function addbrick(targetmesh,pos,w,h,d,placenoise,depthnoise,sizenoise,shapenoise){
			// poisitional noise
			if (dbg) Debug.log("prepos: "+pos +" w:"+w+" h:"+h+" d:"+d+ " pn:"+placenoise+" dn:"+depthnoise + " sn:"+sizenoise);
			
			if (placenoise > 0 || depthnoise > 0){
				var position_displacement = seededrandom3Darr(pos,1000.0,placenoise);
				position_displacement[1] = seededrandom1D(pos,1000.0,depthnoise);
				pos = addmul(pos ,position_displacement, 1.0);
			}
			if (dbg) Debug.log("POS:"+pos);
			//size noise (must always be lower than grout!)
			if (sizenoise > 0 ){
				var size_noise = seededrandom3Darr(pos,2000.0,sizenoise);
			
				size_noise[1] = 0.0;
				
				pos = addmul(pos ,size_noise ,-0.5) ;
				if (dbg) Debug.log("POS:"+pos);
				w = w + 1.0*size_noise[0];
				d = d + 1.0*size_noise[1];
				h = h + 1.0*size_noise[2]; 
				if (dbg) Debug.log("addbrick: "+pos);
			}

			//targetmesh.quad(); // points 
          
           //BLF, BRF, TRF, TLF, BLB, BRB, TRB, TLB
			var pts = [	[pos[0],pos[1],pos[2]], 
				[pos[0] + w, pos[1],pos[2]], 
				[pos[0] + w, pos[1], pos[2]+h], 
				[pos[0],pos[1],pos[2]+h], 
				[pos[0],pos[1]+d,pos[2]], 
				[pos[0] + w, pos[1]+d,pos[2]],
				[pos[0] + w, pos[1]+d, pos[2]+h],
				[pos[0],pos[1]+d,pos[2]+h] ];

			
			
			//shapenoise = seededrandom3Darr(pos,1000.0,shapenoise);
			if (shapenoise > 0){
				for (var i = 0; i < 8; i++){
					pts[i] = addmul(pts[i], seededrandom3Darr(pts[i],1000.0,shapenoise),1.0);
				}
			}
			/*
			targetmesh.quad(pts[0], pts[1],pts[2],pts[3]); // front face
			targetmesh.quad(pts[7], pts[4],pts[5],pts[6]); // back face
			targetmesh.quad(pts[0], pts[3],pts[7],pts[4]); // left face
			targetmesh.quad(pts[1], pts[5],pts[6],pts[2]); // right face
			targetmesh.quad(pts[3], pts[2],pts[6],pts[7]); // top face
			targetmesh.quad(pts[0], pts[1],pts[5],pts[4]); // bottom face
			*/
			//for catmull-clark
			
			//front, back, left, right, top, bottom
			var newCells = [[0,3,2,1], 
						[4,5,6,7],
						[0,4,7,3],
						[1,2,6,5],
						[3,7,6,2],
						[0,1,5,4]
						];
			
			
			/* old
			targetmesh.quad(pos[0],pos[1],pos[2],		pos[0] + w, pos[1],pos[2], 		pos[0] + w, pos[1], pos[2]+h,		pos[0],pos[1],pos[2]+h);// 12 
			targetmesh.quad(pos[0],pos[1]+d,pos[2],		pos[0] + w, pos[1]+d,pos[2],	pos[0] + w, pos[1]+d, pos[2]+h,		pos[0],pos[1]+d,pos[2]+h);// 12 
			targetmesh.quad(pos[0],pos[1],pos[2],		pos[0], pos[1]+d,pos[2],	pos[0], pos[1]+d, pos[2]+h,		pos[0],pos[1],pos[2]+h);// 12 
			targetmesh.quad(pos[0]+w,pos[1],pos[2],		pos[0] + w, pos[1]+d,pos[2],	pos[0] + w, pos[1]+d, pos[2]+h,		pos[0]+w,pos[1],pos[2]+h);// 12 
			targetmesh.quad(pos[0],pos[1],pos[2],		pos[0], pos[1]+d,pos[2],	pos[0] + w, pos[1]+d, pos[2],		pos[0]+w,pos[1],pos[2]);// 12 
			targetmesh.quad(pos[0],pos[1],pos[2]+h,		pos[0], pos[1]+d,pos[2]+h,	pos[0] + w, pos[1]+d, pos[2]+h,		pos[0]+w,pos[1],pos[2]+h);// 12 
			*/
			//add vertices
			var current_points = targetmesh.positions.length;
			for (var i = 0; i < 8;i++){
				targetmesh.positions.push(pts[i]);
			}
			for (var i = 0; i < 6;i++){
				for (var k = 0; k < 4;k++){
					newCells[i][k] = newCells[i][k] + current_points;
				}
				targetmesh.cells.push(newCells[i]);
				//Debug.log(newCells[i]);
			}
			
			if (dbg) Debug.log("Done making brick #pos:"+targetmesh.positions.length+" #cells:"+targetmesh.cells.length);
			
			
			return {positions: pts, cells: newCells};
		}
	var dbg = false;
	if (dbg) Debug.log("Hello");
	var totalh = params['height'];
	var totald = params['depth'];
	var totalw = params['width'];
	var smoothsubdiv = params['smoothsubdiv'];
	var hardsubdiv = params['hardsubdiv'];
	var rows = params['rows'];
	var columns = params['columns'];
	
	var offsetrows = params['offsetrows'];
	var offseteven = params['offseteven'];
	var smallleft = params['smallleft'];
	var smallright = params['smallright'];
	
	var grout =	Math.min(totalw/columns, totalh/rows)*params['grout'];
	var brickheight = Math.max(totalh/rows-grout);
	var brickwidth = 0;
	var brickdepth =	Math.max(0,totald);
	var maxsize = Math.max(totalh/rows, totalw/columns);

	var brickpos;
	var depthnoise = brickdepth * params ['depthnoise'] ;
	var placenoise = maxsize* params ['placenoise'];
	var sizenoise = maxsize * params ['sizenoise'];
	var shapenoise = maxsize * params ['shapenoise'];
	var brickwall = new Mesh3D();
	if (dbg) Debug.log("params:" + params);
	var meshgatherer = {positions : [], cells: []};
	for (var r = 0; r < rows; r ++){
		if (offsetrows == true && ((r%2 == 1 && offseteven == true) || (r%2 == 0 && offseteven == false)) ){
			
			for (var c = 0; c < columns + 1; c++){ 
				
				if (c === 0 || c == columns){ // small bricks
                    if (smallleft   == false && c == 0      ) continue;
                    if (smallright == false && c == columns) continue;
					
                    if (c == 0){
				    	brickpos = [(totalw/columns)*(c +	0 ),0,(totalh/rows)*r];
                    }else{
                        brickpos = [(totalw/columns)*(c -	 0.5),0,(totalh/rows)*r];
                    
                    }
                      brickwidth = Math.max(0,(totalw/columns)*0.5-grout);
					addbrick(meshgatherer,brickpos,brickwidth,brickheight,brickdepth,placenoise,depthnoise,sizenoise,shapenoise);
					if (dbg) Debug.log("Smallbrick " +r + " "+c);
                  
				}else{ //regular bricks
					brickpos = [(totalw/columns)*(c - 0.5),0,(totalh/rows)*r];
					brickwidth = Math.max(0,totalw/columns-grout);
					addbrick(meshgatherer,brickpos,brickwidth,brickheight,brickdepth,placenoise,depthnoise,sizenoise,shapenoise);
					if (dbg) Debug.log("Bigbrick " +r + " "+c);
	
				}
			
          }
			
		}else{ //regular bricks
			for (var c = 0; c < columns; c++){
				brickpos = [(totalw/columns)*c,0,(totalh/rows)*r];
				brickwidth = Math.max(0,totalw/columns-grout);
				addbrick(meshgatherer,brickpos,brickwidth,brickheight,brickdepth,placenoise,depthnoise,sizenoise,shapenoise);
				if (dbg) Debug.log("bigbrick " +r + " "+c);
			}
		}
    }
	dbg = false;
	if (dbg) Debug.log("Making solid!");
    var ccresult = {positions: meshgatherer.positions, cells:meshgatherer.cells};
    if (smoothsubdiv > 0) ccresult = catmullClark(meshgatherer.positions, meshgatherer.cells, smoothsubdiv,hardsubdiv); //function catmullClark(positions, cells, numSubdivisions, numHard ) 
	CCtoMesh(brickwall, ccresult);
		
	return Solid.make(brickwall);
}
