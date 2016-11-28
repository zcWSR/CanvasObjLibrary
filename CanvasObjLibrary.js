/*
MIT LICENSE
Copyright (c) 2016 iTisso
*/
'use strict';
(function(){
function addEvents(target,events={}){
	for(let e in events)target.addEventListener(e,events[e]);
}


//class:CanvasObjLibrary
class CanvasObjLibrary{
	constructor(canvas){
		if(canvas instanceof HTMLCanvasElement === false)
			throw(new TypeError('canvas required'));
		const COL=this;
		Object.assign(this,{
			/*The main canvas*/
			canvas: canvas,
			/*Canvas' context*/
			context: canvas.getContext('2d'),
			default:{
				/*default font*/
				font:{
					fontStyle: null,
					fontWeight: null,
					fontVariant: null,
					color: "#000",
					lineHeight: 14,
					fontSize: 14,
					fontFamily: "Arial",
					strokeWidth: 0,
					strokeColor: "#000",
					shadowBlur: 0,
					shadowColor: "#000",
					shadowOffsetX:0,
					shadowOffsetY:0,
					fill:true,
					lineHeight:18,
					reverse:false,
					//vertical:false,//abandoned
					//textBaseline: "middle",//abandoned
				},
				style:{
					x:0,
					y:0,
					zoomX:1,
					zoomY:1,
					width:1,
					height:1,
					rotate:0,
					hidden:false,
					opacity:1,
					clipOverflow:false,
					backgroundColor:null,
					rotatePointX:0,
					rotatePointY:0,
					positionPointX:0,
					positionPointY:0,
					zoomPointY:0,
					zoomPointY:0,
					skewX:1,
					skewY:1,
					skewPointX:0,
					skewPointY:0,
					composite:null,
					debugBorderColor:'black',
				},
			},
			stat:{
				mouse:{
					x:0,
					y:0
				},
				/*The currently focused on obj*/
				onfocus: null,
				/*The currently mouseover obj*/
				onover: null,
				canvasOnFocus: false,
				canvasOnOver: false,

			},
			tmp:{
				graphID:0,
				onOverGraph:null,
			},
			
			root: null,//root Graph

			class:{},

			autoClear:true,
			//Debug info
			debug:{
				switch:false,
				count:0,
				FPS:0,
				_lastFrameTime:Date.now(),
				_recordOffset:0,
				_timeRecorder:new Uint32Array(15),//记录5帧绘制时的时间来计算fps
				on:function(){
					this.switch=true;
				},
				off:function(){
					this.switch=false;
				},
			},
		});
		//set classes
		for(let c in COL_Class)this.class[c]=COL_Class[c](this);

		//init root graph
		this.root=new this.class.FunctionGraph();
		this.root.name='root';
		//this.root.drawer=null;
		//prevent root's parentNode being modified
		Object.defineProperty(this.root,'parentNode',{configurable:false});

		//adjust canvas drawing size
		this.adjustCanvas();

		//const canvas=this.canvas;
		//add events
		addEvents(canvas,{
			mouseout:e=>{
				this.stat.canvasOnOver=false;
				//clear mouse pos data
				this.stat.mouse.x=null;
				this.stat.mouse.y=null;
				//clear onover obj
				const onover=this.stat.onover;
				this._commonEventHandle(e);
				this.stat.onover=null;
			},
			mouseover:e=>{
				this.stat.canvasOnOver=true;
			},
			mousemove:e=>this._commonEventHandle(e),
			mousedown:e=>{
				this.stat.canvasOnFocus=true;
				this.stat.onfocus=this.stat.onover;
				this._commonEventHandle(e)
			},
			mouseup:e=>this._commonEventHandle(e),
			click:e=>this._commonEventHandle(e),
			dblclick:e=>this._commonEventHandle(e),
			selectstart:e=>e.preventDefault(),
			wheel:e=>{
				const ce=new this.class.WheelEvent('wheel');
				ce.originEvent=e;
				(this.stat.onover||this.root).emit(ce);
			},
			keydown:e=>this._commonEventHandle(e),
			keyup:e=>this._commonEventHandle(e),
			keypress:e=>this._commonEventHandle(e),
		});
		addEvents(document,{
			mousedown:e=>{
				if(e.target!==this.canvas){this.stat.canvasOnFocus=false;}
			},
			mouseout:e=>{
				if(this.stat.mouse.x !== null){
					const eve=new window.MouseEvent('mouseout');
					this.canvas.dispatchEvent(eve);
				}
			}
		});
	}
	generateGraphID(){return ++this.tmp.graphID;}
	adjustCanvas(width=this.canvas.offsetWidth,height=this.canvas.offsetHeight){
		this.root.style.width =this.canvas.width= width;
		this.root.style.height =this.canvas.height= height;
		const ce=new this.class.Event('resize');
		this.root.emit(ce);
	}
	_commonEventHandle(e){
		if(e instanceof MouseEvent){
			this.stat.mouse.x=e.layerX;
			this.stat.mouse.y=e.layerY;
			const ce=new this.class.MouseEvent(e.type);
			ce.originEvent=e;
			(this.stat.onover||this.root).emit(ce);
		}else if(e instanceof MouseEvent){
			const ce=new this.class.KeyboardEvent(e.type);
			ce.originEvent=e;
			(this.stat.onover||this.root).emit(ce);
		}
	}
	draw(){
		const ct=this.context;
		this.debug.count=0;
		ct.setTransform(1,0,0,1,0,0);
		this.autoClear&&ct.clearRect(0,0,this.canvas.width,this.canvas.height);
		this.drawGraph(this.root);
		this.debug.switch&&this.drawDebug();
		if(this.tmp.onOverGraph!==this.stat.onover){//new onover graph
			const oldOnover=this.stat.onover;
			this.stat.onover=this.tmp.onOverGraph;
			if(oldOnover){
				const ceout=new this.class.MouseEvent('mouseout');
				oldOnover.emit(ceout);
			}

			if(this.stat.onover){
				const ceover=new this.class.MouseEvent('mouseover');
				this.stat.onover.emit(ceover);
			}
		}
		this.tmp.onOverGraph=null;
	}
	drawDebug(){
		const ct=this.context,d=this.debug,r=d._timeRecorder,n=Date.now();
		//fps
		r[d._recordOffset++]=n-d._lastFrameTime;
		d._lastFrameTime=n;
		if(d._recordOffset===15)d._recordOffset=0;
		d.FPS=(15000/(r[0]+r[1]+r[2]+r[3]+r[4]+r[5]+r[6]+r[7]+r[8]+r[9]+r[10]+r[11]+r[12]+r[13]+r[14])+0.5)|0;
		//draw
		ct.save();
		ct.beginPath();
		ct.setTransform(1, 0, 0, 1, 0, 0);
		ct.font = "16px Arial";
		ct.textBaseline = "bottom";
		ct.globalCompositeOperation = "lighter";
		ct.fillStyle = "red";
		ct.fillText("point:" + this.stat.mouse.x + "," + this.stat.mouse.y + " FPS:" + this.debug.FPS + " Items:" + this.debug.count, 0, this.canvas.height);
		ct.fillText("onover:" + (this.stat.onover ? this.stat.onover.GID: "null") + " onfocus:" + (this.stat.onfocus ? this.stat.onfocus.GID: "null"), 0, this.canvas.height - 20);
		ct.strokeStyle = "red";
		ct.globalCompositeOperation = "source-over";
		ct.moveTo(this.stat.mouse.x, this.stat.mouse.y + 6);
		ct.lineTo(this.stat.mouse.x, this.stat.mouse.y - 6);
		ct.moveTo(this.stat.mouse.x - 6, this.stat.mouse.y);
		ct.lineTo(this.stat.mouse.x + 6, this.stat.mouse.y);
		ct.stroke();
		ct.restore();
	}

	drawGraph(g){
		const ct=this.context,style=g.style;
		if(style.hidden)return;
		this.debug.count++;
		ct.save();
		ct.globalCompositeOperation = style.composite;
		ct.globalAlpha = style.opacity;
		//position & offset
		ct.translate(style.x-style.positionPointX,style.y-style.positionPointY);
		//skew
		if(style.skewX || style.skewY){
			const t=style.skewPointX || style.skewPointY;
			t&&ct.translate(style.skewPointX,style.skewPointY);
			ct.scale(style.skewX,style.skewY);
			t&&ct.translate(-style.skewPointX,-style.skewPointY);
		}
		//rotate
		if(style.rotate){
			const t=style.rotatePointX || style.rotatePointY;
			t&&ct.translate(style.rotatePointX,style.rotatePointY);
			ct.rotate(style.rotate * 0.0174532925);
			t&&ct.translate(-style.rotatePointX,-style.rotatePointY);
		}
		//zoom
		if(style.zoomX!==1 || style.zoomY!==1){
			const t=style.zoomPointX || style.zoomPointY;
			t&&ct.translate(style.zoomPointX,style.zoomPointX);
			ct.scale(style.zoomX,style.zoomY);
			t&&ct.translate(-style.zoomPointX,-style.zoomPointX);
		}
		if(this.debug.switch){
			ct.save();
			ct.beginPath();
			ct.globalAlpha=0.5;
			ct.globalCompositeOperation = 'source-over';
			ct.strokeStyle=g.style.debugBorderColor;
			ct.strokeWidth=1.5;
			ct.strokeRect(0,0,style.width,style.height);
			ct.strokeWidth=1;
			ct.globalAlpha=1;
			ct.strokeStyle='green';
			ct.strokeRect(style.positionPointX-5,style.positionPointY-5,10,10);
			ct.strokeStyle='blue';
			ct.strokeRect(style.rotatePointX-4,style.rotatePointX-4,8,8);
			ct.strokeStyle='olive';
			ct.strokeRect(style.zoomPointX-3,style.zoomPointX-3,6,6);
			ct.strokeStyle='#6cf';
			ct.strokeRect(style.skewPointX-2,style.skewPointX-2,4,4);
			ct.restore();
		}
		if(g.style.clipOverflow){
			ct.beginPath();
			ct.rect(0,0,style.width,style.height);
			ct.clip();
		}
		if(g.drawer)g.drawer(ct);
		if(g.childNodes.length){
			for(let c of g.childNodes)
				this.drawGraph(c);
		}
		ct.restore();
	}
}

const COL_Class={
	Event:host=>{
		const COL=host;
		return class Event{
			constructor(type){
				this.bubble=true;
				this.type=type;
				this.timeStamp=Date.now();
			}
			stopBubble(){
				this.bubble=false;
			}
		}
	},
	MouseEvent:host=>{
		return class MouseEvent extends host.class.Event{
			constructor(type){
				super(type);
			}
			get button(){return this.originEvent.button;}
		}
	},
	WheelEvent:host=>{
		return class WheelEvent extends host.class.Event{
			constructor(type){
				super(type);
			}
		}
	},
	KeyboardEvent:host=>{
		return class KeyboardEvent extends host.class.Event{
			constructor(type){
				super(type);
			}
		}
	},
	GraphEventEmitter:host=>{
		const COL=host;
		return class GraphEventEmitter{
			constructor(){
				this._events={};
			}
			emit(e){
				if(e instanceof host.class.Event === false)return;
				e.target=this;
				this._resolve(e);
			}
			_resolve(e){
				if(e.type in this._events){
					const hs=this._events[e.type];
					try{
						for(let h of hs)h.call(this,e);
					}catch(e){
						console.error(e);
					}
				}
				if(e.bubble===true && this.parentNode)setTimeout(function(p){p._resolve(e)},0,this.parentNode);
			}
			on(name,handle){
				if(!(handle instanceof Function))return;
				if(!(name in this._events))this._events[name]=[];
				this._events[name].push(handle);
			}
			removeEvent(name,handle){
				if(!(name in this._events))return;
				if(arguments.length===1){delete this._events[name];return;}
				let ind;
				if(ind=(this._events[name].indexOf(handle))>=0)this._events[name].splice(ind,1);
				if(this._events[name].length===0)delete this._events[name];
			}
		}
	},
	GraphStyle:host=>{
		return class GraphStyle{
			constructor(inhertFrom){
				if(inhertFrom && this.inhert(inhertFrom))return;
				this.__proto__.__proto__=host.default.style;
			}
			inhertGraph(graph){//inhert a graph's style
				if(!(graph instanceof host.class.Graph))
					throw(new TypeError('graph is not a Graph instance'));
				this.inhertStyle(graph.style);
				return true;
			}
			inhertStyle(style){
				if(!(style instanceof host.class.GraphStyle))
					throw(new TypeError('graph is not a Graph instance'));
				this.__proto__=style;
				return true;
			}
			inhert(from){
				if(from instanceof host.class.Graph){
					this.inhertGraph(from);
					return true;
				}else if(from instanceof host.class.GraphStyle){
					this.inhertStyle(from);
					return true;
				}
				return false;
			}
			cancelInhert(){
				this.__proto__=Object.prototype;
			}

			getPoint(name){
				switch(name){
					case 'center':{
						return [this.width / 2,this.height / 2];
					}
				}
				return [0,0];
			}
			zoom(x,y){
				if (arguments.length == 1) {
					this.zoomX = this.zoomY = x;
				}
				else{
					this.zoomX = x;
					this.zoomY = y;
				}
			}
			setSize(w,h){
				this.width = w;
				this.height = h;
			}
			setRotatePoint(x,y){
				if (arguments.length == 2) {
					this.rotatePointX = x;
					this.rotatePointY = y;
				} else if (arguments.length == 1) {
					const point=this.getPoint(x);
					this.rotatePointX = point[0];
					this.rotatePointY = point[1];
				}
			}
			setPositionPoint(x,y){
				if (arguments.length == 2) {
					this.positionPointX = x;
					this.positionPointY = y;
				} else if (arguments.length == 1) {
					const point=this.getPoint(x);
					this.positionPointX = point[0];
					this.positionPointY = point[1];
				}
			}
			setZoomPoint(x,y){
				if (arguments.length == 2) {
					this.zoomPointY = x;
					this.zoomPointY = y;
				} else if (arguments.length == 1) {
					const point=this.getPoint(x);
					this.zoomPointX = point[0];
					this.zoomPointY = point[1];
				}
			}
			setSkewPoint(x,y){
				if (arguments.length == 2) {
					this.zoomPointY = x;
					this.zoomPointY = y;
				} else if (arguments.length == 1) {
					const point=this.getPoint(x);
					this.skewPointX = point[0];
					this.skewPointY = point[1];
				}
			}
		}
	},
	Graph:host=>{
		return class Graph extends host.class.GraphEventEmitter{
			constructor(){
				super();
				//this.name=name;
				this.host=host;
				this.GID=this.host.generateGraphID();
				Object.defineProperties(this,{
					style:{value: new host.class.GraphStyle(),configurable:true},
					childNodes:{value: []},
					parentNode:{value: undefined,configurable:true}
				});
			}
			createShadow(){
				const shadow=Object.create(this);
				shadow.GID=this.host.generateGraphID();
				shadow.shadowParent=this;
				Object.defineProperties(shadow,{
					style:{value: new host.class.GraphStyle(this.style),configurable:true},
					//childNodes:{value: []},
					parentNode:{value: undefined,configurable:true}
				});
				return shadow;
			}
			//add a graph to childNodes' end
			appendChild(graph){
				if(!(graph instanceof host.class.Graph))
					throw(new TypeError('graph is not a Graph instance'));
				if(graph===this)return false;
				if(graph.parentNode!==this){
					Object.defineProperty(graph, 'parentNode', {
					  value: this,
					});
				}else{
					let i=this.findChild(graph);
					if(i>=0)this.childNodes.splice(i,1);
				}
				this.childNodes.push(graph);
			}
			//insert this graph after the graph
			insertAfert(graph){
				if(!(graph instanceof host.class.Graph))
					throw(new TypeError('graph is not a Graph instance'));
				if(graph===this)return false;
				let p=graph.parentNode,io,it;
				if(!p)return false;
				it=p.findChild(graph);
				if(it<0)return false;
				if(p!==this.parentNode){
					Object.defineProperty(this, 'parentNode', {
					  value: p,
					});
				}else{
					io=p.findChild(this);
					if(io>=0)p.childNodes.splice(io,1);
				}
				p.childNodes.splice((io<it)?it:it+1,0,this);
			}
			//insert this graph before the graph
			insertBefore(graph){
				if(!(graph instanceof host.class.Graph))
					throw(new TypeError('graph is not a Graph instance'));
				if(graph===this)return false;
				let p=graph.parentNode,io,it;
				if(!p)return false;
				it=p.findChild(graph);
				if(it<0)return false;
				if(p!==this.parentNode){
					Object.defineProperty(this, 'parentNode', {
					  value: p,
					});
				}else{
					io=p.findChild(this);
					if(io>=0)p.childNodes.splice(io,1);
				}
				p.childNodes.splice((io<it)?it-1:it,0,this);
			}
			findChild(graph){
				for(let i=this.childNodes.length;i--;)
					if(this.childNodes[i]===graph)return i;
				return -1;
			}
			removeChild(graph){
				let i=this.findChild(graph);
				if(i<0)return;
				this.childNodes.splice(i,1);
				Object.defineProperty(this, 'parentNode', {
				  value: undefined,
				});
			}

			checkIfOnOver(){
				const m=this.host.stat.mouse;
				if(m.x === null)return false;
				if(this===this.host.tmp.onOverGraph)return true;
				if(this.host.debug.switch){
					this.host.context.save();
					this.host.context.strokeStyle='yellow';
					this.host.context.stroke();
					this.host.context.restore();
				}
				if(this.host.context.isPointInPath(m.x,m.y)){
					this.host.tmp.onOverGraph=this;
					return true;
				}
				return false;
			}
			delete(){//remove it from the related objects
				if(this.parentNode)this.parentNode.removeChild(this);
				if(this.host.stat.onover===this)this.host.stat.onover=null;
				if(this.host.stat.onfocus===this)this.host.stat.onfocus=null;
			}
		}
		
	},
	FunctionGraph:host=>{
		return class FunctionGraph extends host.class.Graph{
			constructor(drawer){
				super();
				if(drawer instanceof Function){
					this.drawer=drawer;
				}
				this.style.debugBorderColor='#f00';
			}
			drawer(ct){
				//onover point check
				ct.beginPath();
				ct.rect(0,0,this.style.width,this.style.height);
				this.checkIfOnOver();
			}
		}
	},
	ImageGraph:host=>{
		return class ImageGraph extends host.class.FunctionGraph{
			constructor(image){
				super();
				if(image)this.use(image);
				this.style.debugBorderColor='#0f0';
				this.enableEvent=true;
			}
			use(image){
				if(image instanceof Image){
					this.image=image;
					if (!image.complete) {
						image.addEventListener('load',e=> {
							this.resetStyleSize();
						});
					}else{
						this.resetStyleSize();
					}
					return true;
				}else if(image instanceof HTMLCanvasElement){
					this.image=image;
					this.resetStyleSize();
					return true;
				}
				throw(new TypeError('Wrong image type'));
			}
			get width(){
				if(this.image instanceof Image)return this.image.naturalWidth;
				if(this.image instanceof HTMLCanvasElement)return this.image.width;
				return 0;
			}
			get height(){
				if(this.image instanceof Image)return this.image.naturalHeight;
				if(this.image instanceof HTMLCanvasElement)return this.image.height;
				return 0;
			}
			resetStyleSize(){
				this.style.width=this.width;
				this.style.height=this.height;
			}
			drawer(ct){
				//onover point check
				ct.beginPath();
				ct.drawImage(this.image, 0, 0);
				if(this.enableEvent){
					ct.beginPath();
					ct.rect(0,0,this.style.width,this.style.height);
					this.checkIfOnOver();
				}
			}
		}
	},
	CanvasGraph:host=>{
		return class CanvasGraph extends host.class.ImageGraph{
			constructor(){
				super();
				this.image=document.createElement('canvas');
				this.context=this.image.getContext('2d');
				this.autoClear=true;
			}
			draw(func){
				if(this.autoClear)this.context.clearRect(0,0,this.width,this.height);
				func(this.context);
			}
			set width(w){this.image.width=w;}
			set height(h){this.image.height=h;}
		}
	},
	TextGraph:host=>{
		return class TextGraph extends host.class.FunctionGraph{
			constructor(text=''){
				super();
				this.text=text;
				this.font=Object.create(host.default.font);
				this._fontString='';
				this.realtimeRender=false;
				this._renderList=null;
				this.autoSize=true;
				this.enableEvent=true;
				this.style.debugBorderColor='#00f';
				this._cache=null;
				Object.defineProperty(this,'_cache',{configurable:true});
			}
			prepare(){//prepare text details
				if(!this._cache && !this.realtimeRender){
					Object.defineProperty(this,'_cache',{value:document.createElement("canvas")});
				}
				let font = "";
				(this.font.fontStyle)&&(font = this.fontStyle);
				(this.font.fontVariant)&&(font =`${font} ${this.fontVariant}`);
				(this.font.fontWeight)&&(font =`${font} ${this.fontWeight}`);
				font =`${font} ${this.fontSize}px`;
				(this.font.fontFamily)&&(font =`${font} ${this.fontFamily}`);
				this._fontString = font;

				if(this.realtimeRender)return;
				const imgobj = this._cache,ct = imgobj.getContext("2d");
				ct.font = font;
				ct.clearRect(0, 0, imgobj.width, imgobj.height);
				this._renderList = this.text.split(/\n/g);
				this.estimatePadding=Math.max(
					this.font.shadowBlur+5+Math.max(Math.abs(this.font.shadowOffsetY),Math.abs(this.font.shadowOffsetX)),
					this.font.strokeWidth+3
				);
				if (this.autoSize) {
					let w = 0,tw,lh=(typeof this.font.lineHeigh ==='number')?this.font.lineHeigh:this.font.fontSize;
					for (let i = this._renderList.length; i -- ;) {
						tw = ct.measureText(this._renderList[i]).width;
						(tw>w)&&(w=tw);//max
					}
					imgobj.width = (this.style.width = w) + this.estimatePadding*2;
					imgobj.height = (this.style.height = this._renderList.length * lh)+ (lh<this.font.fontSize)?this.font.fontSize*2:0 + this.estimatePadding*2;
				} else {
					imgobj.width = this.style.width;
					imgobj.height = this.style.height;
				}
				ct.translate(this.estimatePadding, this.estimatePadding);
				this.render(ct);
			}
			render(ct){//render text
				if(!this._renderList)return;
				ct.font=this._fontString;//set font
				ct.textBaseline = 'top';
				ct.lineWidth = this.font.strokeWidth;
				ct.strokeStyle = this.font.strokeColor;
				ct.shadowBlur = this.font.shadowBlur;
				ct.shadowOffsetX = this.font.shadowOffsetX;
				ct.shadowOffsetY = this.font.shadowOffsetY;
				for (let i = this._renderList.length;i--;) {
					this.font.fill&&ct.fillText(this._renderList[i],0, this.font.lineHeight*i);
					this.font.strokeWidth&&ct.strokeText(this._renderList[i], 0, this.font.lineHeight*i);
				}
			}
			drawer(ct){
				ct.beginPath();
				if(this.realtimeRender){//realtime render the text
					//onover point check
					if(this.enableEvent){
						ct.rect(0,0,this.style.width,this.style.height);
						this.checkIfOnOver();
					}
					this.render(ct);
				}else{//draw the cache
					if(!this._cache){
						this.prepare();
					}
					ct.drawImage(this._cache, -this.estimatePadding, -this.estimatePadding);
					if(this.enableEvent){
						ct.rect(0,0,this.style.width,this.style.height);
						this.checkIfOnOver();
					}
				}
			}
		}
	},
}

window.CanvasObjLibrary=CanvasObjLibrary;


//code from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
if (typeof Object.assign != 'function')
Object.assign = function (target) {
  'use strict';
  // We must check against these specific cases.
  if (target === undefined || target === null) {
    throw new TypeError('Cannot convert undefined or null to object');
  }
  var output = Object(target);
  for (var index = 1; index < arguments.length; index++) {
    var source = arguments[index];
    if (source !== undefined && source !== null) {
      for (var nextKey in source) {
        if (source.hasOwnProperty(nextKey)) {
          output[nextKey] = source[nextKey];
        }
      }
    }
  }
  return output;
};


if(!Float32Array.__proto__.from) {
	let copy_data = [];
    Float32Array.__proto__.from = function (obj, func, thisObj) {
        var typedArrayClass = Float32Array.__proto__;
        if(typeof this !== "function")
            throw new TypeError("# is not a constructor");
        if(this.__proto__ !== typedArrayClass)
        	throw new TypeError("this is not a typed array.");
        func = func || (elem=>{return elem;});
        if (typeof func !== "function")
        	throw new TypeError("specified argument is not a function");
        obj = Object(obj);
        if(!obj["length"])
        	return new this(0);
        copy_data.length=0;
        for(let i=0; i<obj.length; i++){
            copy_data.push(obj[i]);
        }
        copy_data = copy_data.map(func, thisObj);
        const typed_array = new this(copy_data.length);
        for(let i=0; i<typed_array.length; i++) {
            typed_array[i] = copy_data[i];
        }
        return typed_array;
    }
}


(function() {
	if(window.requestAnimationFrame)return;
	var lastTime = 0;
	var vendors = ['ms', 'moz', 'webkit', 'o'];
	for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
		window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
		window.cancelRequestAnimationFrame = window[vendors[x] + 'CancelRequestAnimationFrame'];
	}
	if (!window.requestAnimationFrame) window.requestAnimationFrame = function(callback, element, interval) {
		var currTime = Date.now();
		var timeToCall = interval || (Math.max(0, 1000 / 60 - (currTime - lastTime)));
		callback(0);
		var id = window.setTimeout(function() {
			callback(currTime + timeToCall);
		},
		timeToCall);
		lastTime = currTime + timeToCall;
		return id;
	};
	if (!window.cancelAnimationFrame) window.cancelAnimationFrame = function(id) {
		clearTimeout(id);
	};
}());

}());