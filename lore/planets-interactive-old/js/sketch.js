//Utility Functions
function Matrix(x, y){
	if (y === undefined){
		y = x;
	}
	return Array.from(Array(x), () => new Array(y));
}
function loadFile(filePath) {
  let result = null;
  let xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", filePath, false);
  xmlhttp.send();
  if (xmlhttp.status == 200) { 
	  result = xmlhttp.responseText;
  }
  return result;
}

//Const settings
const MAPFILE = "assets/map.json"
const SETTING_MAX_SELECT_DIST = 3;
const CHECKBOX_COLOR_ARRAY = [128, 128, 128];
const TEXT_COLOR_ARRAY = [128, 128, 128];
const BUTTON_COLOR_ARRAY = [86, 86, 86];
const POI_COLOR_ARRAY = [64, 128, 255];
const SELECTOR_COLOR_ARRAY = [12, 140, 0];
const PATH_COLOR_ARRAY = [6, 70, 0];
const GREEN_OK_COLOR_ARRAY = [24, 255, 0];
const DEFAULT_POI_SIZE = 2;
const DEFAULT_PATH_WEIHT = 0.5;
const DETAILS_VISIBILITY = 72;

//state variables
let mapString;
let mapData;
let poiReverseLookup = {};
let selectedIndex = -1;
let selectedIndexLock = -1;
let UIElementList = [];
let mapSetting = {
	drawNames:false,
	drawRoutes:false
}
let cachedImages = {};
//Internal Functions

function Checkbox_Click_Function(){
	if (this.checked === undefined){
		this.checked = true;
	}else{
		this.checked = !this.checked;		
	}
}

function Checkbox_Draw_Function(){
	noFill();
	//draw check, if enabled
	if (this.checked){
		let off = sqrt(this.scale.x/8 * this.scale.x/8 * 2) / 2;
		strokeWeight(5);
		stroke(GREEN_OK_COLOR_ARRAY);
		let min = new p5.Vector(this.pos.x + off, this.pos.y + off);
		let max = new p5.Vector(this.pos.x + this.scale.x - off, this.pos.y + this.scale.y - off);
		line(min.x, min.y, max.x, max.y);
		line(min.x, max.y, max.x, min.y);
	}
	//draw the box
	stroke(CHECKBOX_COLOR_ARRAY);
	strokeWeight(2);
	rect(this.pos.x, this.pos.y, this.scale.x, this.scale.y, this.scale.x/8);
	textAlign(LEFT, CENTER);
	strokeWeight(0.4);
	fill(CHECKBOX_COLOR_ARRAY);
	textSize(this.scale.x);
	text(this.name, this.pos.x + this.scale.x + 5, this.pos.y + (this.scale.y/2));
}

function URL_Button_Click_Function(){
	if (this.selected === undefined || this.selected < 0){
		alert("Page not Avalable");
	}else{
		let poi = mapData.poi[this.selected];
		if (poi.href === undefined){
			alert("Page not Avalable");
		}else{
			window.open(poi.href, "_blank");
		}
	}
}

//the URL button is special, it does not care about its "position", as its position is totally relateive to screen size.
function URL_Button_Draw_Function(){
	let selected = 0;
	if (selectedIndexLock >= 0){
		selected = selectedIndexLock;
	}else{
		selected = selectedIndex;
	}
	this.selected = selected;
	if (selected >= 0){
		this.pos.x = 2*width/3+48;
		this.pos.y = height-78;
		this.scale.x = width/3-96;
		this.scale.y = 32
		
		let mPos = new p5.Vector(mouseX, mouseY);
		if (this.isPointIn(mPos)){
			stroke(SELECTOR_COLOR_ARRAY);
		}else{
			stroke(BUTTON_COLOR_ARRAY);
		}
		strokeWeight(2);
		fill(BUTTON_COLOR_ARRAY);
		rect(this.pos.x, this.pos.y, this.scale.x, this.scale.y);
		
		stroke(TEXT_COLOR_ARRAY);
		fill(TEXT_COLOR_ARRAY);
		textAlign(CENTER, TOP);
		textSize(16);
		strokeWeight(0.1);
		text("Go To System Page", this.pos.x, this.pos.y+8, this.scale.x, this.scale.y);
	}
}


//Internal Classes
class cam{
	constructor(px, py, sc){
		if (px === undefined){
			px = -width/2;
		}
		if (py === undefined){
			py = -height/2;
		}
		if (sc === undefined){
			sc = 1
		}
		this.pos = new p5.Vector(px, py);
		this.scale = sc;
	}
	PreDraw(){
		push();
		translate(width/2, height/2);
		push();
		scale(this.scale);
		translate(this.pos.x, this.pos.y);
	}
	PostDraw(){
		pop();
		pop();
	}
	MoveV(offset){ //expects vector
		this.MoveI(offset.x, offset.y);
	}
	MoveI(x, y){ //expects individual values
		this.pos.x += (x / this.scale);
		this.pos.y += (y / this.scale);
	}
	Scale(dir){
		let scalar = 2*abs(dir);
		if (dir < 1){ //should this be '< 0'?
			scalar = 1/scalar;
		}
		this.scale *= scalar;
	}
	ScreenToWorld(p){//expects a vector
		return new p5.Vector(
			((p.x - width/2)/this.scale - this.pos.x),
			((p.y - height/2)/this.scale - this.pos.y)
		);
	}
	WorldToScreen(p){//expects a vector
		return new p5.Vector(
			((p.x + this.pos.x)*this.scale + width/2),
			((p.y + this.pos.y)*this.scale + height/2)
		);
	}
}

class UIElement{
	constructor(x, y, width, height, name, interactFunc, drawFunc){
		this.pos = new p5.Vector(x, y);
		this.scale =  new p5.Vector(width, height);
		this.name = name;
		this.interactFunc = interactFunc;
		if (drawFunc === undefined){
			drawFunc = function(){
				noStroke();
				fill(128);
				rect(this.pos.x, this.pos.y, this.scale.x, this.scale.y);
			}
		}
		this.drawFunc = drawFunc;
		//add to element list
		UIElementList.push(this);
	}
	draw(){
		if (typeof(this.drawFunc) === "function"){
			this.drawFunc();			
		}
	}
	click(){
		if (typeof(this.interactFunc) === "function"){
			this.interactFunc();			
		}else{
			console.log("User clicked on a UIElement that does not have a valid interact function!");
		}
	}
	isPointIn(v){
		return !(
			(v.x < this.pos.x) || 
			(v.x > this.pos.x+this.scale.x) || 
			(v.y < this.pos.y) || 
			(v.y > this.pos.y+this.scale.y)
		);
	}
}


//More state variables that depend on classes
let CAM = new cam(0,0,4);


//LOAD
function preload(){
	mapString = loadFile(MAPFILE);
	mapData = JSON.parse(mapString);
	//load all the images needed
	for (let i=0;i<mapData.poi.length;i++){
		let poi = mapData.poi[i];
		if (poi.image !== undefined && cachedImages[poi.image] === undefined){
			//console.log("Loading image: " + poi.image)
			cachedImages[poi.image] = loadImage(poi.image);
		}
		if (poiReverseLookup[poi.name] !== undefined){
			console.log("ERROR: each POI should have a unique name. Ignoring overwrite. Name:" + poi.name);
		}else{
			poiReverseLookup[poi.name] = i;
		}
	}
	//cache background images too
	for (let i=0;i<mapData.background.length;i++){
		let bg = mapData.background[i];
		if (bg.image !== undefined && cachedImages[bg.image] === undefined){
			//console.log("Loading image: " + poi.image)
			cachedImages[bg.image] = loadImage(bg.image);
		}
	}
}

window.onresize = function(){
	resizeCanvas(window.innerWidth-50, window.innerHeight-50);
}

//SETUP
function setup(){
	createCanvas(window.innerWidth-50, window.innerHeight-50);
	angleMode(DEGREES);
	
	new UIElement(24, height-64, 16, 16, "Draw Names", function(){Checkbox_Click_Function.call(this);mapSetting.drawNames = this.checked;}, Checkbox_Draw_Function);
	
	new UIElement(24, height-40, 16, 16, "Draw Routes", function(){Checkbox_Click_Function.call(this);mapSetting.drawRoutes = this.checked;}, Checkbox_Draw_Function);
	
	new UIElement(0, 0, 0, 0, "URL Button", URL_Button_Click_Function, URL_Button_Draw_Function);
}


//DRAW
function draw(){
	background(0);
	
	CAM.PreDraw();
	
	//Render the background objects
	for (let i=0;i<mapData.background.length;i++){
		let bg = mapData.background[i];
		let bgColor = color(0, 0, 0);
		if (bg.color !== undefined){
			bgColor = color(bg.color)
		}
		push();
		translate(bg.pos.x, bg.pos.y);
		if (bg.angle !== undefined){
			if (bg.angle === "random"){
				if (bg.currAngle === undefined){
					bg.currAngle = Math.random() * 360;
				}
				rotate(bg.currAngle);
			}else{
				rotate(bg.angle);
			}
		}
		
		if (bg.type === undefined){
			//draw nothing
		}else if (bg.type == "image"){
			//draw an image
			tint(bgColor);
			image(
				cachedImages[bg.image], 
				-bg.size.x/2, 
				-bg.size.y/2, 
				bg.size.x, 
				bg.size.y
			);
		}else if (bg.type === "shape"){
			if (bg.color === undefined){
				noFill();
			}else{
				fill(bg.color);
			}
			if (bg.stroke === undefined){
				noStroke();
			}else{
				stroke(bg.stroke);
			}
			if (bg.strokeWeight !== undefined){
				strokeWeight(bg.strokeWeight);
			}else{
				strokeWeight(1);
			}
			
			if (bg.size !== undefined){
				scale(bg.size.x, bg.size.y);
			}
			if (bg.shape_type === undefined || bg.shape_type === "poly"){
				beginShape();
			}else{
				let BSparam = null;
				if (bg.shape_type === "points"){BSparam = POINTS;}
				else if (bg.shape_type === "lines"){BSparam = LINES;}
				else if (bg.shape_type === "triangles"){BSparam = TRIANGLES;}
				else if (bg.shape_type === "triangle_fan"){BSparam = TRIANGLE_FAN;}
				else if (bg.shape_type === "triangle_strip"){BSparam = TRIANGLE_STRIP;}
				else if (bg.shape_type === "quads"){BSparam = QUADS;}
				else if (bg.shape_type === "quad_strip"){BSparam = QUAD_STRIP;}
				beginShape(BSparam);
			}
			//now, draw verts
			for (let j=0;j<bg.verts.length;j++){
				vertex(bg.verts[j].x, bg.verts[j].y);
			}
			
			if (bg.shape_close === undefined || !bg.shape_close){
				endShape();
			}else{
				endShape(CLOSE);
			}
		}else if (bg.type === "text"){
			let textAlignH = CENTER;
			let textAlignV = CENTER;
			if (bg.textAlignH !== undefined){
				if (bg.textAlignH === "left"){
					textAlignH = LEFT;
				}else if (bg.textAlignH === "right"){
					textAlignH = RIGHT;
				}
			}
			if (bg.textAlignV !== undefined){
				if (bg.textAlignV === "top"){
					textAlignH = TOP;
				}else if (bg.textAlignV === "bottom"){
					textAlignH = BOTTOM;
				}
			}
			textAlign(textAlignH, textAlignV);
			
			if (bg.textSize !== undefined){
				textSize(bg.textSize);
				if (bg.size !== undefined){
					scale(bg.size.x, bg.size.y);
				}
			}else{
				if (bg.size !== undefined){
					if (bg.size.x !== undefined){
						textSize(bg.size.x);						
					}else{
						textSize(bg.size);
					}
				}else{
					textSize(16);
				}
			}
			
			if (bg.strokeWeight !== undefined){
				strokeWeight(bg.strokeWeight);
			}else{
				strokeWeight(1);
			}
			stroke(bgColor);
			
			text(bg.text, 0, 0);
		}
		pop();
	}
	
	
	//Render the paths
	noFill();
	if (mapSetting.drawRoutes){		
		for (let i=0;i<mapData.paths.length;i++){
			let path = mapData.paths[i];
			let start = mapData.poi[poiReverseLookup[path.start]];
			let end = mapData.poi[poiReverseLookup[path.end]];
			if (start !== undefined && end !== undefined){
				if (path.weight === undefined){
					strokeWeight(DEFAULT_PATH_WEIHT);
				}else{
					strokeWeight(path.weight);
				}
				if (path.color === undefined){
					stroke(PATH_COLOR_ARRAY);
				}else{
					stroke(path.color);
				}
				line(start.pos.x, start.pos.y, end.pos.x, end.pos.y);
			}
			else 
			{
				console.log("Error: index: " + i + " had an invalid start or end. Start: " + path.start + "["+poiReverseLookup[path.start]+"] End: " + path.end + "["+poiReverseLookup[path.end]+"]");
			}
		}
	}
	
	
	//render the systems
	for(let i=0;i<mapData.poi.length;i++){
		let poi = mapData.poi[i];
		let s = DEFAULT_POI_SIZE;
		push();
		translate(poi.pos.x, poi.pos.y);
		if (poi.angle !== undefined){
			if (poi.angle === "random"){
				if (poi.currAngle === undefined){
					poi.currAngle = Math.random() * 360;
				}
				rotate(poi.currAngle);
			}else{
				rotate(poi.angle);
			}
		}
		
		if (poi.scale !== undefined){
			s *= poi.scale;
		}
		if (poi.type === undefined || poi.type === "default"){
			if (poi.color !== undefined){
				fill(poi.color);
			}else{
				fill(POI_COLOR_ARRAY);
			}
			noStroke();
			ellipse(0, 0, s);
		}else if (poi.type === "image"){
			if (poi.color !== undefined){
				tint(poi.color);
			}else{
				noTint();
			}
			image(cachedImages[poi.image], -s/2, -s/2, s, s);
		}else if (poi.type === "null"){
			//draw nothing
		}
		
		if (mapSetting.drawNames){
			textAlign(CENTER, BOTTOM);
			textSize(2);
			strokeWeight(0.02);
			fill(TEXT_COLOR_ARRAY);
			stroke(TEXT_COLOR_ARRAY);
			text(poi.name, 0, - s/2);
		}
		pop();
	}
	
	
	
	//update the selector marker based off of mouse position
	//TODO: possibly change it so distance to POI is based off on screen space, instead of world. To do this, change from getting worldspace coords of mouse to getting screenspace coords of POI
	const mousePos = CAM.ScreenToWorld(new p5.Vector(mouseX, mouseY));
	let maxDist = Infinity; 
	for(let i=0;i<mapData.poi.length;i++){
		let poi = mapData.poi[i];
		let poi_pos = new p5.Vector(poi.pos.x, poi.pos.y);
		let dist = p5.Vector.dist(mousePos, poi_pos);
		if (dist < maxDist){
			maxDist = dist;
			selectedIndex = i;
		}
	}
	if (maxDist > SETTING_MAX_SELECT_DIST){
		selectedIndex = -1;
	}
	
	//draw a circle around the selected POI
	if (selectedIndex >= 0){
		let poi = mapData.poi[selectedIndex];
		noFill();
		stroke(SELECTOR_COLOR_ARRAY);
		strokeWeight(2/ CAM.scale);
		ellipse(poi.pos.x, poi.pos.y, SETTING_MAX_SELECT_DIST*2);
	}
	
	
	
	CAM.PostDraw();
	
	
	//Handle Camera Movement 
	if (mouseIsPressed){
		//block mouse if it is inside of UI element
		let propToWorld = true
		if (mouseButton === LEFT){
			let mPos = new p5.Vector(mouseX, mouseY);
			for (let i=0;i<UIElementList.length;i++){
				let elm = UIElementList[i];
				if (elm.isPointIn(mPos)){
					propToWorld = false;
					//elm.click();
				}
			}
		}
		
		if (propToWorld){
			if(mouseButton === CENTER || (mouseButton === LEFT && selectedIndex === -1)){
				//move stuff here
				let off = new p5.Vector(mouseX - pmouseX, mouseY - pmouseY); //for some reason, movedX and movedY are not accurate.
				CAM.MoveV(off);
				
			}
			// lock/unlock selectedIndex
			if (mouseButton === LEFT){
				selectedIndexLock = selectedIndex;
			}
		}
	}
	
	
	//UI       _____
	//  |   |    |
	//  |   |    |
	//  \___/  __|__
	
	//Draw the top text areas
	textSize(16);
	fill(TEXT_COLOR_ARRAY);
	stroke(TEXT_COLOR_ARRAY);
	strokeWeight(0.1);
	
	
	//mouse pos, zoom level
	textAlign(LEFT, TOP);
	let mpos = CAM.ScreenToWorld(new p5.Vector(mouseX, mouseY));
	text ("Pos: {x:"+mpos.x+",y:"+mpos.y+"}" , 24, 24);
	text ("Scale: " + CAM.scale + ":1", 24, 48);
	
	//Details pannel
	let third = width/3
	stroke(TEXT_COLOR_ARRAY);
	fill(BUTTON_COLOR_ARRAY[0], BUTTON_COLOR_ARRAY[1], BUTTON_COLOR_ARRAY[2], DETAILS_VISIBILITY);
	strokeWeight(1);
	rect(
		2*third+24,
		24,
		third-48,
		height-48,
		10
	)
	
	let selected = 0;
	if (selectedIndexLock >= 0){
		selected = selectedIndexLock;
	}else{
		selected = selectedIndex;
	}
	if (selected >= 0){
		strokeWeight(0.1);
		stroke(TEXT_COLOR_ARRAY);
		fill(TEXT_COLOR_ARRAY);
		let px = 2*third+48;
		let py = 48;
		
		//draw name
		let selectedName =  mapData.poi[selected].name;
		textSize(32);
		textAlign(LEFT, TOP);
		text(selectedName, px, py);
		
		//draw description
		let desc = "No Data Avalable";
		if (mapData.poi[selected].desc !== undefined){
			desc = mapData.poi[selected].desc;
		}
		textSize(16);
		//rect(px, py+56, third-96, height-210)
		text(desc, px, py+56, third-96, height-210);
	}
	
	//Draw the UI control elements
	for (let i=0;i<UIElementList.length;i++){
		UIElementList[i].draw();
	}
}

//handle camera scaling
function mouseWheel(e){
	if (e.delta > 0){ //zoom out
		CAM.Scale(-1);
	}else{
		CAM.Scale(1);
	}
	return false;
}

//clicking of UI elements
function mouseClicked(e){
	if (mouseButton === LEFT){
		let mPos = new p5.Vector(mouseX, mouseY);
		for (let i=0;i<UIElementList.length;i++){
			let elm = UIElementList[i];
			if (elm.isPointIn(mPos)){
				elm.click();
			}
		}
	}
}
