// Convenience Declarations For Dependencies.
// 'Core' Is Configured In Libraries Section.
// Some of these may not be used by this example.
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

		{ "id": "height", "displayName": "Height", "type": "length", "rangeMin": 1.0, "rangeMax": 200.0, "default": 50.0 },
		{ "id": "width" , "displayName": "Width" , "type": "length", "rangeMin": 1.0, "rangeMax": 200.0, "default": 50.0 },
		{ "id": "depth" , "displayName": "Depth" , "type": "length", "rangeMin": 1.0, "rangeMax": 200.0, "default": 3.0  },
		{ "id": "grout" , "displayName": "Grout" , "type": "float" , "rangeMin": 0.0, "rangeMax": 20.0 , "default": 1.0  },
		
		{ "id": "rows"    , "displayName": "Rows"   , "type": "int", "rangeMin": 1, "rangeMax": 200, "default": 12 },
		{ "id": "columns" , "displayName": "Columns", "type": "int", "rangeMin": 1, "rangeMax": 200, "default": 8  },
		
		{ "id": "depthnoise" , "displayName": "Depth Randomness" , "type": "float" , "rangeMin": 0.0, "rangeMax": 10.0 , "default": 1.0  }, // this should somehow be scale invariant?
		{ "id": "placenoise" , "displayName": "Placement Randomness" , "type": "float" , "rangeMin": 0.0, "rangeMax": 10.0 , "default": 1.0  }, // this should somehow be scale invariant?
		{ "id": "sizenoise" , "displayName": "Size Randomness" , "type": "float" , "rangeMin": 0.0, "rangeMax": 10.0 , "default": 1.0  } // this should somehow be scale invariant?
		
		
	];


	function process(params) {
		function seededrandom1D(forpoint,multiplier, scaler){
			return Math.sin( (forpoint.x + forpoint.y + forpoint.z)*multiplier)*scaler;
		}

		function seededrandom3Darr(forpoint,multiplier, scaler){
			var pt = [Math.sin( (forpoint.x + forpoint.y + forpoint.z)*multiplier*1.1)*scaler,
					Math.sin( (forpoint.x + forpoint.y + forpoint.z)*multiplier*1.1)*scaler,
					Math.sin( (forpoint.x + forpoint.y + forpoint.z)*multiplier*1.1)*scaler];
			return pt;
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
		function addbrick(targetmesh,pos,w,h,d,placenoise,depthnoise,sizenoise){
			// poisitional noise
          
          if (dbg) Debug.log("prepos: "+pos.x + " " + pos.y + " " +pos.z);
          
          if (dbg) Debug.log("pt2a: "+pt2a(pos));
			var position_displacement = seededrandom3D(pos,1000.0,placenoise);
			position_displacement.y = seededrandom1D(pos,1000.0,depthnoise);
			pos = pos + position_displacement;
			
			//size noise (must always be lower than grout!)
			var size_noise = seededrandom3D(pos,2000,sizenoise);
			pos = pos - 0.5*size_noise  ;
			w.x = w.x + 0.5*size_noise.x;
			d.y = d.y + 0.5*size_noise.y;
			h.z = h.z + 0.5*size_noise.z;
          if (dbg) Debug.log("addbrick: "+pos.x + " " + pos.y + " " +pos.z);
			//takes Point3D arguments as pos
			//takes Vector3D as w,h,d
			//var brick = new Mesh3D();
			//targetmesh.quad(); // points
            targetmesh.quad()// 12 
          
			targetmesh.quad(pt2a(pos), pt2a(pos + w), pt2a(pos + w + h), pt2a(pos+h)); //front face
			targetmesh.quad(pt2a(pos + d), pt2a(pos + w + d), pt2a(pos + w + h +d), pt2a(pos + h + d)); //back face
			targetmesh.quad(pt2a(pos), pt2a(pos + d), pt2a(pos + d + h), pt2a(pos+h)); //left face
			targetmesh.quad(pt2a(pos + w), pt2a(pos + d + w), pt2a(pos + d + h +w) , pt2a(pos+h+w)); //right face
			targetmesh.quad(pt2a(pos), pt2a(pos + d), pt2a(pos + d + w), pt2a(pos+w)); //bottom
			targetmesh.quad(pt2a(pos + h),pt2a( pos + d + h), pt2a(pos + d + w + h), pt2a(pos+w + h)); //top
			return 0;
		}
    var dbg = true;
    if (dbg) Debug.log("Hello");
	var totalh = params['height'];
	var totald = params['depth'];
	var totalw = params['width'];
	var rows = params['rows'];
	var rows = 1; //params['rows'];
	var columns = params['columns'];
	var columns = 1;//params['columns'];
	var offset = false;// params['offset'];
	var grout = params ['grout'];
	var depthnoise = params ['depthnoise'] ;
	var placenoise = params ['placenoise'];
	var sizenoise = params ['sizenoise'];
	//var rotnoise = params ['rotnoise'];
	var brickheight = Math.max(0,totalh/rows-grout);
    var brickwidth = 0;
      var brickdepth = 0;
    var brickpos;
	var brickwall = new Mesh3D();
	//var brick
      if (dbg) Debug.log("params:" + params);

	for (var r = 0; r < rows; r ++){
		if (r%2==1 && offset === true){
			for (var c = 0; c < columns + 1; c++){
				if (c === 0 || c == columns){ // small bricks
					brickpos = new Point3D((totalw/columns)*(c +  0 ),0,(totalh/rows)*r);
					brickpos.y = Math.sin(500*(brickpos.x+brickpos.z));
					brickheight = new Point3D(0,0,Math.max(totalh/rows-grout));
					brickwidth = new Point3D(Math.max((totalw/columns)*0.5-grout),0,0);
					brickdepth = new Point3D(Math.max(0,depth,0));
					addbrick(brickwall,brickpos,brickwidth,brickheight,brickdepth,placenoise,depthnoise,sizenoise);
                    if (dbg) Debug.log("Smallbrick " +r + " "+c);
				}else{ //regular bricks
					brickpos = new Point3D((totalw/columns)*(c + 0.5),0,(totalh/rows)*r);
					brickpos.y = Math.sin(500*(brickpos.x+brickpos.z));
					brickheight = new Point3D(0,0,Math.max(totalh/rows-grout));
					brickwidth = new Point3D(Math.max(totalw/columns-grout),0,0);
					brickdepth = new Point3D(Math.max(0,depth,0));
					addbrick(brickwall,brickpos,brickwidth,brickheight,brickdepth,placenoise,depthnoise,sizenoise);
                    if (dbg) Debug.log("bigbrick " +r + " "+c);
	
				}
			}
			
		}else{ //regular bricks
			for (var c = 0; c < columns; c++){
				brickpos = new Point3D((totalw/columns)*c,0,(totalh/rows)*r);
				brickpos.y = Math.sin(500*(brickpos.x+brickpos.z));
				brickheight = new Point3D(0,0,Math.max(totalh/rows-grout));
				brickwidth = new Point3D(Math.max(totalw/columns-grout),0,0);
				brickdepth = new Point3D(Math.max(0,totald,0));
				addbrick(brickwall,brickpos,brickwidth,brickheight,brickdepth,placenoise,depthnoise,sizenoise);
                if (dbg) Debug.log("bigbrick " +r + " "+c);
			}
		}
	  }
	  //return addbrick(Point3D(0,0,0),Point3D(10,0,0),Point3D(0,10,0),Point3D(0,0,10),placenoise,depthnoise,sizenoise);
	return Solid.make(brickwall);
	}