/*
____      __      __    ___
|   \    /  \    /  \  /    
|    \  |    |  |      \___ 
|    /  |    |  |          \
|___/    \__/    \__/   ___/



//The center of the system is always 0,0
//items with no root are centered on that root.

Procedural Body Generation
{
    "name":<Body Name, String>,
    "count":<number (randomizable)>,
    "mass":<number (randomizable)>,
    "radius":<number (randomizable)>,
    "pos":{ <relative to parent>
        "x":<number (randomizable)>,
        "y":<number (randomizable)>,
    },
    "color":<Color: One of four ways: Colorstring ("#RRGBB" or "#RRGGBBAA" in hex). List of [R,G,B]. List of [[R1,R2],[G1,G2],[B1,B2]]. List of [ColorString1, ColorString2]>,
    "visuals":[ <ALL fields but color are FIXED!>
        {    
            "form":<one of: "circle", "ellipse", "square", "rect", "rectangle", "triangle", "polygon", "image", or  "multipass" (not implemented)>,
            "fill":<Color, as above>,
            "stroke":<Color, as above>,
            "color":<Color, as above, to set both fill and stroke>,
            "noFill":<"true" for no fill>,
            "noStroke":<"true" for no stroke>,
            "width":<number. Fraction of body radius>,
            "height":<number. Fraction of body radius>
            "strokeWeight":<number>
        },
        ...
    ],
    "type":<string - FIXED>,
    "parent":<string name of another body, or omitted for no parent and thus no orbit
    "anomaly":<number, degrees (randomizable), or omitted for no orbit>,
    "eccentricity":<normalized number (0 to 1) (randomizable), or omitted for no orbit>,
    "semiMajorAxis":<number (randomizable), or omitted for no orbit>,
    "baseAngle":<number, degrees (randomizable), or omitted for no orbit>
    "pathWeight":<number (randomizable), or omitted for no orbit>,
    "href":<link - fixed!>,
    "desc":<string>,
    "gmhidden":<boolean - fixed!>,
    "gmnote":<string - fixed!>,
},


For names, descriptions, and parents, different characters are replaced with different things:

Procedural Name Generation:
# - becomes a digit (number 0-9)
$ - becomes a non-0 digit (number 1-9)

[roman:<number>] - becomes a roman numeral. <number> can be a number of a combination of '#' and '$'
[parent] - becomes the parent name
[increment] - becomes the incremental number created.

{<procedurla>} - an all-lowercase name for a set of names in name_parts.json.
    Examples:
        {real} - becomes a name of a Real Moon from the Real Solar System
        {starwars} - becomes a planet name from Star Wars
        {dune} - becomes a planet name from Dune
        {hitchhiker} - becomes a planet name from Hitch Hiker's Guide to the Galaxy
        {stargate} - becomes a planet name from Stargate

Procedural Parent Generation
    SomeName - use that name
    {previous} - use one of the previous bodies. Random which one if more than one.
    {<typename>} - use one of the existing type names. Picks a random body of that type.

Procedural Description Generation
    <text> - that text is used as a description
    {name} - replaced with the body name
    {parent} - replaced with the body parent
    {parent:<number>} - replaced with the body parent, jumping back <number> generations. 
        {parent:1} is equivalent to {parent}, while {parent:2} is the grandparent body
        If <number> is higher than there are parents, it defaults to the root body.
        This only works if the parent body is already added.
    {root} - replaced with the root body for the inheritance chain.
        This only works if the parent body is already added.
    {eccentricity} - body eccentricity
    {semimajoraxis} - body semi-major axis
    {perigeeangle} - body perigee angle
    {mass} - body mass
    {radius} - body radius
    [texta|textb|textc|...] - picks a random entry from the list, separated by vertical pipes



Route Generation:

{
    "start":<bodyname>,
    "end":<bodyname>,
    "color":<Color, as described above. - uses Separate random sequence from bodies, and is not stable.>,
    "thickness":<number, path thickness>,
    "style":<one of "line", "dotted">,
    "circle_ends":<boolean>,
    "gmhidden"<boolean>,
    "draw_after_bodies":<boolean>,
    "pattern":string pattern of the dotted line
}
*/

let UIElementList = [];
let ShowFlagUIList = [];
let SystemList = [];
let NamePart = {};

let bIsPaused = false;
let bShowHelp = false;
let SimulationTimeScale = 1;
let FocusIndex = -1;
let SelectedIndex = -1;
let SelectedIndexLock = -1;
let SystemSelectedIndex = -1;
let TimeFromLastClick=0;
let IsGMView = false;
let DefaultCamScale = 1;
Background={
    elements:{}
};

let MapFilePath = "";
let MapSeed = "DefaultSeed";
const SystemListFilePath = "assets/map_index.json";
const NamePartFilePath = "assets/name_parts.json";

const G = 6.67 * Math.pow(10, -11);
const CHECKBOX_COLOR_ARRAY = [128, 128, 128];
const TEXT_COLOR_ARRAY = [148, 148, 148];
const BUTTON_COLOR_ARRAY = [56, 56, 56];
const BUTTON_BG_COLOR_ARRAY = [26, 26, 26];
const POI_COLOR_ARRAY = [64, 128, 255];
const SELECTOR_COLOR_ARRAY = [12, 140, 0];
const PATH_COLOR_ARRAY = [6, 70, 0];
const GREEN_OK_COLOR_ARRAY = [24, 255, 0];
const SETTING_MAX_SELECT_DIST = 1.5;
const DETAILS_VISIBILITY = 72;
const BODY_FOCUS_SCREENSIZE=100;
const CAMERA_FOCUS_TIME_FRAMES=75;
const DOUBLECLICK_DURATION = 0.5;
const SIN45 = Math.sin(Math.PI/4);
const HELP_TEXT = `Help:

Camera: The camera can be dragged around with middle mouse button or left mouse button. Press 'h' to return it to the default position. Zooming can be done with the scroll wheel.

Focus: Focus is used to lock the camera relative to a body. Change the focus with left or right arrows, or the square brackets, or double-click on a body. Press 'Esc' to focus on the parent body of the currently focused body.

Time: Simulation Time can be increased or decreased. Use the '+' and '-' keys to change the simulation time. You can pause and unpause the simulation with 'p'.

Map: There are several selectable maps. Use the dropdown list at the top, or the Up and Down arrow keys to switch between them.
`

 //Camera
class CamObject{
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
        this.body=undefined;
        this.targetView = undefined;
    }

    PreDraw(ParallaxLevel){
        if (ParallaxLevel === undefined){
            ParallaxLevel = 1;
        }

        if (this.targetView !== undefined){
            //handle lerping to target
            this.targetView.frames++;
            let frac = this.targetView.frames / this.targetView.maxFrames;
            if (frac >= 1){
                this.pos = createVector(this.targetView.pos.x, this.targetView.pos.y);
                this.scale = this.targetView.scale;
                this.targetView = undefined;
                this.SetCamControlLocked(false);
            }
            else{
                frac = 6*pow(frac, 5) - 15*pow(frac, 4) + 10*pow(frac,3); //large polynomial lerp, very smooth
                this.pos.x = lerp(this.targetView.rootpos.x, this.targetView.pos.x, frac);
                this.pos.y = lerp(this.targetView.rootpos.y, this.targetView.pos.y, frac);
                this.scale = lerp(this.targetView.rootscale, this.targetView.scale, frac);
            }
        }

        push();
        translate(width/2, height/2);
        push();
        let actualScale = lerp(1.0, this.scale, ParallaxLevel);
        scale(actualScale);
        translate(this.pos.x * ParallaxLevel * (this.scale/actualScale), this.pos.y * ParallaxLevel * (this.scale/actualScale));
        if (this.body !== undefined && this.body.worldpos !== undefined){
            push()
            translate(-this.body.worldpos.x, -this.body.worldpos.y);
            this.needs_extra_pop = true;
        }
        ellipseMode(CENTER);
        rectMode(CENTER);
    }

    PostDraw(){
        pop();
        pop();
        if (this.needs_extra_pop){
            pop();
            this.needs_extra_pop = false;
        }
    }

    MoveV(offset){ //expects vector
        if (this.locked){return;}
        this.MoveI(offset.x, offset.y);
    }

    MoveI(x, y){ //expects individual values
        if (this.locked){return;}
        this.pos.x += (x / this.scale);
        this.pos.y += (y / this.scale);
    }

    Scale(dir){
        if (this.locked){return;}
        let scalar = 2*abs(dir);
        if (dir < 1){ //should this be '< 0'?
            scalar = 1/scalar;
        }
        this.scale *= scalar;
    }

    ScreenToWorld(p){//expects a vector
      if (this.body !== undefined && this.body.worldpos !== undefined){
        return new p5.Vector(
            ((p.x - width /2)/this.scale - this.pos.x + this.body.worldpos.x),
            ((p.y - height/2)/this.scale - this.pos.y + this.body.worldpos.y)
        );
      }
      else{
        return new p5.Vector(
            ((p.x - width /2)/this.scale - this.pos.x),
            ((p.y - height/2)/this.scale - this.pos.y)
        );
      }
    }

    WorldToScreen(p){//expects a vector
      if (this.body !== undefined && this.body.worldpos !== undefined){
        return new p5.Vector(
            ((p.x + this.pos.x - this.body.worldpos.x)*this.scale + width /2),
            ((p.y + this.pos.y - this.body.worldpos.y)*this.scale + height/2)
          );
      }
      else{
        return new p5.Vector(
            ((p.x + this.pos.x)*this.scale + width /2),
            ((p.y + this.pos.y)*this.scale + height/2)
        );
      }
    }

    LockToBody(body){
        //calculate old position
        let oldpos = createVector(this.pos.x, this.pos.y)
        if (this.body !== undefined){
            oldpos.sub(this.body.worldpos.x, this.body.worldpos.y);
        }
        if (body){
            oldpos.add(body.worldpos.x, body.worldpos.y);
        }

        this.body = body;
        this.pos.x = oldpos.x;
        this.pos.y = oldpos.y;
        //zoom to have screen size a specific size
        let targetScale = this.scale;
        if (body !== undefined){
            while (body.radius * targetScale < BODY_FOCUS_SCREENSIZE){
                targetScale *= 2;
            }
            while (body.radius * targetScale > BODY_FOCUS_SCREENSIZE){
                targetScale /= 2;
            }
        }
        else{
            targetScale = DefaultCamScale;
        }

        this.targetView = {
            rootpos:createVector(oldpos.x, oldpos.y),
            rootscale:this.scale,
            pos:createVector(0,0),
            scale:targetScale,
            frames:0,
            maxFrames:CAMERA_FOCUS_TIME_FRAMES
        }
        this.SetCamControlLocked(true);
    }

    SetCamControlLocked(locked){
        this.locked = (locked === true);
    }

    IsPointOnScreen(point){
        let screenPoint = this.WorldToScreen(point);
        return screenPoint.x >= 0 && screenPoint.x <= width && screenPoint.y >= 0 && screenPoint.y <= height;
    }

    IsRectOnScreen(p1, p2){
        let sp1 = this.WorldToScreen(p1);
        let sp2 = this.WorldToScreen(p2);
        let minp = {x:Math.min(sp1.x, sp2.x), y:Math.min(sp1.y, sp2.y) };
        let maxp = {x:Math.max(sp1.x, sp2.x), y:Math.max(sp1.y, sp2.y) };
        return (
            maxp.x >= 0 && minp.x <= width &&
            maxp.y >= 0 && minp.y <= height
        );
    }

    IsScreenWithin(p1, p2){
        let sp1 = this.WorldToScreen(p1);
        let sp2 = this.WorldToScreen(p2);
        let minp = {x:Math.min(sp1.x, sp2.x), y:Math.min(sp1.y, sp2.y) };
        let maxp = {x:Math.max(sp1.x, sp2.x), y:Math.max(sp1.y, sp2.y) };
        return minp.x < 0 && minp.y < 0 && maxp.x > width && maxp.y > height;
    }

    /*
    ----------
    |-4|-3|-2|
    |--------|
    |-1| 0| 1|
    |--------|
    | 2| 3| 4|
    ----------
    Quadrant 0 is within the window
    */
    GetPointQuadrant(point){
        let qid = 0;
        let screenPoint = this.WorldToScreen(point);

        if (screenPoint.x < 0){
            qid -= 1;
        }
        else if (screenPoint.x > width){
            qid += 1;
        }

        if (screenPoint.y < 0){
            qid -= 3;
        }
        else if (screenPoint.y > height){
            qid += 3;
        }
        return qid;
    }
}

let Cam = new CamObject(0,0,DefaultCamScale);




//convert from polar coordinates to rectiliniar coordinates
function polar_to_rect(radius, theta){
    return createVector(cos(theta)*radius, -sin(theta)*radius);
}

//calculate the orbital radius
function calculate_orbital_radius(semiMajorAxis, eccentricity, anomaly){
    return semiMajorAxis*(1-pow(eccentricity, 2)) / (1+eccentricity*cos(anomaly));
}

// load a file from web
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

// Turn a digit into a roman numeral
function romanize(num) {
    let lookup = {M:1000,CM:900,D:500,CD:400,C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1};
    let roman = '';
    let i;
    for ( i in lookup ) {
        while ( num >= lookup[i] ) {
            roman += i;
            num -= lookup[i];
        }
    }
    return roman;
}

function GetRandomValueWithDefault(primitive, alpha, default_value, type_if_nil_default){
    if (type_if_nil_default === undefined){
        type_if_nil_default = typeof default_value;
    }
    if (typeof (primitive) == type_if_nil_default){
        return primitive;
    }
    else if (
        typeof (primitive) === "object" && 
        typeof (primitive[0]) === type_if_nil_default && 
        typeof (primitive[1]) === type_if_nil_default
    ){
        return lerp(primitive[0], primitive[1], alpha);
    }
    return default_value;
}

function ShowGMContent(b){
    if (b || b === undefined){
        IsGMView = true;
    }
    else{
        IsGMView = false;
    }
    Body.InvalidateCachedDesc();
}

/*

        _______
|    |     |
|    |     |
|    |     |
\____/  ___|___

User Interface
*/

//UI Element class. Very generic.
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
    destroy(){
        const index = UIElementList.indexOf(this);
        if (index > -1){
            UIElementList.splice(index, 1);
        }
        return this;
    }
}

//click on a checkbox
function Checkbox_Click_Function(){
    if (this.checked === undefined){
        this.checked = true;
    }else{
        this.checked = !this.checked;        
    }
}

//draw a checkbox
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

//the URL button click function
function URL_Button_Click_Function(){
    if (this.selected !== undefined && this.selected >= 0){
        let body = Body.List[this.selected];
        if (body !== undefined){
            if (body.href !== undefined && body.href !== ""){
                window.open(body.href, "_blank");
            }
        }
    }
}

//the URL button is special, it does not care about its "position", as its position is totally relateive to screen size.
function URL_Button_Draw_Function(){
    let selected = 0;
    if (SelectedIndexLock >= 0){
        selected = SelectedIndexLock;
    }else{
        selected = SelectedIndex;
    }
    this.selected = selected;
    if (selected >= 0 && Body.List[selected].href !== undefined){
        this.pos.x = 2*width/3+48;
        this.pos.y = height-78;
        this.scale.x = width/3-96;
        this.scale.y = 32;
        
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
        text("Go To Body Page", this.pos.x, this.pos.y+8, this.scale.x, this.scale.y);
    }
    //invisible
    this.pos.x = 2*width/3+48;
    this.pos.y = height-78;
    this.scale.x = 0;
    this.scale.y = 0;
}

//option on the dropdown system selector
function SystemSelectorField_Draw_Function(){
    if (this.index === undefined || this.root === undefined){
        this.destroy();
    }

    this.pos.x = Math.floor(width/2)-128;
    this.pos.y = 52+(26*this.index);
    this.scale.x = 256;
    this.scale.y = 24;

    let mPos = new p5.Vector(mouseX, mouseY);
    if (this.isPointIn(mPos)){
        stroke(SELECTOR_COLOR_ARRAY);
    }else{
        stroke(BUTTON_BG_COLOR_ARRAY);
    }

    strokeWeight(2);
    fill(BUTTON_COLOR_ARRAY);
    rect(this.pos.x, this.pos.y, this.scale.x, this.scale.y);

    stroke(TEXT_COLOR_ARRAY);
    fill(TEXT_COLOR_ARRAY);
    textAlign(CENTER, CENTER);
    textSize(14);
    strokeWeight(0.08);
    text(SystemList[this.index].name, this.pos.x+(this.scale.x/2), this.pos.y+(this.scale.y/2));
}

//option on the dropdown system selector
function SystemSelectorField_Click_Function(){
    //set selected index
    loadMapFromIndex(this.index);
    
    //destroy dropdown
    this.root.is_dropped = false;
    for (let i=0;i<this.root.droplist.length;i++){
        this.root.droplist[i].destroy();
    }
    this.root.droplist = [];
}

//Main view of system selector dropdown box
function SystemSelector_Draw_Function(){
    this.pos.x = Math.floor(width/2)-128;
    this.pos.y = 24;
    this.scale.x = 256;
    this.scale.y = 24;

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
    textAlign(CENTER, CENTER);
    textSize(14);
    strokeWeight(0.08);
    text(SystemList[SystemSelectedIndex].name, this.pos.x+(this.scale.x/2), this.pos.y+(this.scale.y/2));
}

//main view of the system selector dropdown box
function SystemSelector_Click_Function(){
    if (this.is_dropped === undefined){
        this.is_dropped = false;
        this.droplist = [];
    }

    if (this.is_dropped){
        this.is_dropped = false;
        //clear drop list
        for (let i=0;i<this.droplist.length;i++){
            this.droplist[i].destroy();
        }
        this.droplist = [];
    }
    else{
        this.is_dropped = true;
        //deal with this later...
        for (let i=0;i<SystemList.length;i++){
            let UI = new UIElement(0,0,0,0, "SystemDropdownElement:"+SystemList[i].name, SystemSelectorField_Click_Function, SystemSelectorField_Draw_Function);
            UI.index = i;
            UI.root = this;
            this.droplist.push(UI);
        }
    }
}


function DrawSelectedUITextBlock(){
    push();
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
    if (SelectedIndexLock >= 0){
        selected = SelectedIndexLock;
    }else{
        selected = SelectedIndex;
    }
    if (selected >= 0){
        strokeWeight(0.1);
        stroke(TEXT_COLOR_ARRAY);
        fill(TEXT_COLOR_ARRAY);
        let px = 2*third+48;
        let py = 48;
        let body = Body.List[selected];
        //draw name
        textSize(24);
        textAlign(LEFT, TOP);
        text(body.GetDisplayName(), px, py);
        //draw description
        textSize(16);
        //rect(px, py+56, third-96, height-210)
        text(body.GetDescription(), px, py+40, third-96, height-210);
    }
    pop();
}

//text in top left
function DrawStatsTextBlock(){
    push();

    textSize(16);
    fill(255);
    stroke(255);
    strokeWeight(0.1);
    textAlign(LEFT, TOP);
    let mpos = Cam.ScreenToWorld(new p5.Vector(mouseX, mouseY));
    text ("Pos: {x:"+mpos.x+",y:"+mpos.y+"}" , 24, 24);
    if (Cam.scale > 1){
        text ("Scale: 1:" + Cam.scale, 24, 24*2);
    }
    else{
        text ("Scale: " + (1/Cam.scale) + ":1", 24, 24*2);
    }
    let focusName = "None";
    if (FocusIndex > -1){
        focusName = Body.List[FocusIndex].name
    }
    text ("Focus: " + focusName, 24, 24*3);
    if (bIsPaused){
        text ("Time Scale: "+SimulationTimeScale+" (PAUSED)", 24, 24*4);
    }
    else{
        text ("Time Scale: " + SimulationTimeScale, 24, 24*4);
    }

    if (bShowHelp) {
        text (HELP_TEXT, 24, 24*5, width/3, height-24*6);
    }
    else{
        text ("Press '?' to show help.", 24, 24*5);
    }
    pop();
}

/* 
__                    ___
| \     /\    |\   |  |  \
|  |   /  \   | \  |  |   |
|\/   /----\  |  \ |  |   |
| \  /      \ |   \|  |__/

Random Generation Stuff
*/

//random generator stuff
// hasher and random generator from here:
// https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript

//hasher
function cyrb128(str) {
    let h1 = 1779033703, h2 = 3144134277,
        h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return [(h1^h2^h3^h4)>>>0, (h2^h1)>>>0, (h3^h1)>>>0, (h4^h1)>>>0];
}

//random generator
//outputs a value [0, 1]
function sfc32(a, b, c, d) {
    return function() {
        a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
        var t = (a + b) | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        d = d + 1 | 0;
        t = t + d | 0;
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    }
}



function buffered_rand_wrapper(base_rand){
    let count = 0;
    return {
        rand:function(){
            count++;
            return base_rand();
        },
        buffer:function(x){
            while(count%x !== 0){
                base_rand();
                count++;
            }
        }
    }
}

//build a color.
//guaranteed to consume exactly 3 random numbers
function InterpretRandomColor(primitive, rand){
    let result;
    let interps = [
        rand(),
        rand(),
        rand(),
    ]
    if (typeof (primitive) == "object"){
        if (primitive.length == 3){
            //three pairs of numbers
            result = [0,0,0];
            for (let k=0;k<3;k++){
                if (typeof (primitive[k]) == "number"){
                    result[k] = primitive[k];
                }
                else if (
                    typeof (primitive[k]) == "object" && 
                    typeof (primitive[k][0]) == "number" && 
                    typeof (primitive[k][1]) == "number"
                ){
                    result[k] = lerp(primitive[k][0], primitive[k][1], interps[k]);
                }
                else{
                    console.log("Random Color Has malformed color: "+primitive);
                    return;
                }
                
            }
            result = color(result);
        }
        else if (primitive.length == 2){
            //pair of strings
            let c1 = color(primitive[0]);
            let c2 = color(primitive[1]);
            result = color(
                lerp(red(c1), red(c2), interps[0]),
                lerp(green(c1), green(c2), interps[1]),
                lerp(blue(c1), blue(c2), interps[2]),
            );
        }
    }
    else if (typeof (primitive) == "string"){
        result = color(primitive);
    }
    return result;
}

/*
         _______   ___                             ___
\     /     |     /      |    |     /\     |      /    
 \   /      |     \___   |    |    /  \    |      \___ 
  \ /       |         \  |    |   /----\   |          \
   V     ___|___   ___/  \____/  /      \  |____   ___/

*/

//enum
class EVisualForm{
    //these MUST be manually kept in check! 
    //there is no way to do it automatically.
    static ELLIPSE=0;
    static RECTANGLE=1;
    static TRIANGLE=2;
    static POLYGON=3;
    static IMAGE=4;
    static TEXT=5;
    static MULTIPASS=6;
    static LENGTH=7;

    static ForEach(func){
        for(let i=0;i<EVisualForm.LENGTH;i++){
            func(i);
        }
    }

    static ToString(val){
        switch(val){
            case EVisualForm.ELLIPSE : return "ellipse";
            case EVisualForm.RECTANGLE : return "rectangle";
            case EVisualForm.TRIANGLE : return "triangle";
            case EVisualForm.POLYGON : return "polygon";
            case EVisualForm.IMAGE : return "image";
            case EVisualForm.MULTIPASS : return "multipass";
            default: return "";
        }
    }
}

class PolyPoint{
    constructor(x,y,otx,oty,itx,ity){
        //validation 
        if (typeof x !== "number" || typeof y !== "number"){
            console.log("Invalid Point!")
            return;
        }
        this.x = x;
        this.y = y;
        if (typeof otx !== typeof oty){
            console.log("Invalid tangent setup for Point - tangent ignored.");
            return;
        }
        if (typeof otx === "number" && typeof oty === "number"){
            this.outTangentX = otx;
            this.outTangentY = oty;
        }
        else{
            //no tangent data - not a curve
            return;
        }
        if (typeof itx === "number" && typeof ity === "number"){
            this.inTangentX = itx;
            this.inTangentY = ity;
        }
        else{
            this.inTangentX = -otx;
            this.inTangentY = -oty;
        }
    }

    HasTangent(){
        return (this.outTangentX !== undefined);
    }
}

//the visual representation of a body or background object, excluding its name.
class Visuals{
    constructor(primitive, rand){
        if (primitive === undefined){
            this.form = EVisualForm.LENGTH;
            this.stroke = color(255,255,255);
            this.fill = color(255,255,255);
            this.width=1;
            this.height=1;
            this.offset = createVector(0,0);
            this.angle=0;
            this.readyToDraw = true;

            this.imageName = "";
            this.points = undefined; //undefined, or an array of PolyPoints
            this.closed = false; //close the polygon/curve
            return;
        } 

        //deal with the visual form
        this.form = EVisualForm.LENGTH;
        if (typeof (primitive.form) === "string"){
            switch(primitive.form){
                case "circle": //intentional fallthrough
                case "ellipse" : {
                    this.form = EVisualForm.ELLIPSE;
                    break;
                }
                case "square": //intentional fallthrough
                case "rect": //intentional fallthrough
                case "rectangle" : {
                    this.form = EVisualForm.RECTANGLE;
                    break;
                }
                case "triangle" : {
                    this.form = EVisualForm.TRIANGLE;
                    break;
                }
                case "polygon" : {
                    this.form = EVisualForm.POLYGON;
                    break;
                }
                case "image" : {
                    this.form = EVisualForm.IMAGE;
                    break;
                }
                case "text" : {
                    this.form = EVisualForm.TEXT;
                    break;
                }
                case "multipass" : {
                    console.log("ERROR: multipass form for Body Visuals is not yet supported.")
                    this.form = EVisualForm.LENGTH;
                    break;
                }
                default : {
                    console.log("ERROR: "+primitive.form+" form for Body Visuals is not supported.")
                    this.form = EVisualForm.LENGTH;
                }
            }
        }
        else{
            console.log("Malformed primitive for a BodyVisuals Object");
        }
        if (this.form >= EVisualForm.LENGTH){
            return;
        }

        //deal with the rest of the visuals
        
        
        /*
        load the primitive width and height. 
        
        Valid Forms:
        {
            width:<number>,
            height:<number>
        }
        or
        {
            size:<number>,
        }
        or
        {
            size:[<number>,<number>],
        }
        or
        {
            size:{x:<number>,y:<number>},
        }
         */
        if (typeof (primitive.width) === "number" && typeof (primitive.height) === "number" ){
            this.width = primitive.width;
            this.height = primitive.height;
        }
        else if (typeof (primitive.size) === "number"){
            this.width = primitive.size;
            this.height = primitive.size;
        }
        else if (typeof (primitive.size) === "object"){
            if (typeof (primitive.size.x) === "number" && typeof (primitive.size.y) === "number" ){
                this.width = primitive.size.x;
                this.height = primitive.size.y;
            }
            else if (typeof (primitive.size[0]) === "number" && typeof (primitive.size[1]) === "number" ){
                this.width = primitive.size[0];
                this.height = primitive.size[1];
            }
        }

        //offset
        if (typeof (primitive.offset) === "object" && 
            typeof (primitive.offset.x) === "number" && 
            typeof (primitive.offset.y) === "number"
        ){
            this.offset = createVector(primitive.offset.x, primitive.offset.y);
        }
        else{
            this.offset = createVector(0,0);
        }

        //deal with color. this CAN be random!!! ONLY this can be random.
        if (typeof (primitive.fill) == "string" || typeof (primitive.fill) == "object"){
            this.fill = InterpretRandomColor(primitive.fill, rand);
        }
        else{
            this.fill = undefined;
        }
        if (typeof (primitive.stroke) == "string" || typeof (primitive.stroke) == "object"){
            this.stroke = InterpretRandomColor(primitive.stroke, rand);
        }
        else{
            this.stroke = undefined;
        }
        if (typeof (primitive.color) == "string" || typeof (primitive.color) == "object"){
            let c = InterpretRandomColor(primitive.color, rand);
            if (this.stroke === undefined){
                this.stroke = color(c);
            }
            if (this.fill === undefined){
                this.fill = color(c);
            }
        }
        if (primitive.noStroke){
            this.stroke = undefined;
        }
        if (primitive.noFill){
            this.fill = undefined;
        }
        
        //angle
        this.angle = radians(GetRandomValueWithDefault(primitive.angle, rand(), 0));
        

        //strokeWieght
        if (typeof (primitive.strokeWeight) === "number"){
            this.strokeWeight = primitive.strokeWeight;
        }
        else{
            this.strokeWeight = 1;
        }

        //image stuff
        if (this.form === EVisualForm.IMAGE){
            if (typeof (primitive.image) !== "string" ){
                this.form = EVisualForm.LENGTH;
                console.log("Body Visual that is an image must provide a string to an image!")
                return;
            }
            this.imageName = primitive.image;
            this.GetImage(); //actually load the image
        }

        //text stuff
        if (this.form === EVisualForm.TEXT){
            if (typeof (primitive.text) !== "string"){
                this.form = EVisualForm.LENGTH;
                console.log("Visual that is text needs to have a string text field of the text to render!");
                return;
            }
            this.text = primitive.text;

            this.alignment = [0,0];
            if (typeof (primitive.alignment) === "object" && 
                typeof (primitive.alignment[0]) === "number" &&
                typeof (primitive.alignment[1]) === "number"
            ){
                this.alignment = [primitive.alignment[0], primitive.alignment[1]];
            }

            //TODO: add font support
        }

        //polygon stuff
        if (this.form === EVisualForm.POLYGON){
            this.closed = false;
            if (primitive.closed){
                this.closed = true;
            }
            if (typeof (primitive.points) !=="object" || typeof (primitive.points.length) !== "number" || primitive.points.length < 1){
                this.form = EVisualForm.LENGTH;
                console.log("Body Visual that is an polygon must provide an array of points!")
                return;
            }
            let using_tangents = true;
            if (primitive.use_controlpoints){
                using_tangents = false;
            }
            this.points = []
            for (let i=0;i<primitive.points.length;i++){
                let pp = primitive.points[i];
                if (typeof pp !== "object" || typeof (pp.length) !== "number" || pp.length < 2){
                    console.log("Invalid point detected in list of Body Visual points. Points should be an array of numbers, with lengths of 2, 4, or 6.")
                    continue;
                }
                let p = new PolyPoint(pp[0],pp[1],pp[2],pp[3],pp[4],pp[5])
                if (p.x === undefined){
                    console.log("Invalid point detected in list of Body Visual points. Points should be an array of numbers, with lengths of 2, 4, or 6.")
                    continue;
                }
                if (!using_tangents && p.HasTangent()){
                    //tangents were supplied as control points. Convert back to tangent values.
                    p.inTangentX -= p.x;
                    p.outTangentX -= p.x;
                    p.inTangentY -= p.y;
                    p.outTangentY -= p.y;
                }
                this.points.push(p); //add to point list
            }
            if (this.points.length < 1){
                console.log("ERROR: Body Visuals: Not enough valid control points were found.");
                this.form = EVisualForm.LENGTH;
                return;
            }
        }
    }

    Draw(dTime, pos, angle, size){
        if (this.readyToDraw === false){return;}//cannot draw if not ready!
        if (angle === undefined){angle = 0;}
        if (size === undefined){size = 1;}
        push();
        translate(pos.x, pos.y);
        rotate(this.angle + angle);
        if (this.form === EVisualForm.TEXT){
            textSize(size);
        }
        else{
            scale(size);
        }

        if (this.stroke !== undefined){
            stroke(this.stroke);
        }
        else{
            noStroke();
        }

        if (this.fill !== undefined){
            fill(this.fill);
            tint(this.fill);
        }
        else{
            noFill();
            noTint();
        }

        strokeWeight(this.strokeWeight);

        //drawing code here
        
        push();
        translate(this.offset.x, this.offset.y);
        switch(this.form){
            case EVisualForm.ELLIPSE : {
                ellipse(0,0,this.width, this.height);
                break;
            }
            case EVisualForm.RECTANGLE : {
                rect(0,0,this.width, this.height);
                break;
            }
            case EVisualForm.TRIANGLE : {
                triangle(
                    -this.width/2, -this.height/2,
                    this.width/2, -this.height/2,
                    0, this.height/2,
                );
                break;
            }
            case EVisualForm.POLYGON : {
                if (this.points === undefined || this.points.length === undefined || this.points.length < 1){
                    console.log("WARNING: Attempted to render a polygon without a valid point list")
                    break;
                }
                this.DrawPolygon();
                break;
            }
            case EVisualForm.IMAGE : {
                let img = this.GetImage();
                
                image(img, -this.width/2, -this.height/2, this.width, this.height);
                break;
            }
            case EVisualForm.TEXT : {
                let ta1 = CENTER;
                let ta2 = CENTER;
                if (this.alignment[0] < 0) {
                    ta1 = LEFT;
                }
                else if (this.alignment[0] > 0) {
                    ta1 = RIGHT;
                }
                
                if (this.alignment[1] < 0) {
                    ta2 = BOTTOM;
                }
                else if (this.alignment[1] > 0) {
                    ta2 = TOP;
                }
                textAlign(ta1, ta2);
                
                text(this.text, 0,0);
            }
        }
        pop();
        pop();
    }

    DrawPolygon(){
        beginShape();
        { // i == 0 is a bit special because of curves - it must be drawn as a single vertex
            let point = this.points[0];
            vertex(point.x, point.y)
        }
        for(let i=1;i<this.points.length;i++){
            this.DrawLineSegment(this.points[i-1], this.points[i]);
        }
        if (this.closed){
            this.DrawLineSegment(this.points[this.points.length-1], this.points[0]);
            endShape(CLOSE); //the "CLOSE" will do nothing, as it manually closed. But it will make fill work nicely.
        }
        else{
            endShape();
        }

    }

    //both points are polypoings
    DrawLineSegment(startpoint, endpoint){
        if (startpoint.HasTangent() && endpoint.HasTangent()){
            //draw a curve line
            bezierVertex(
                startpoint.x+startpoint.outTangentX, startpoint.y+startpoint.outTangentY, 
                endpoint.x+endpoint.inTangentX, endpoint.y+endpoint.inTangentY,
                endpoint.x, endpoint.y
            );
        }
        else{
            //draw a straight line
            vertex(endpoint.x, endpoint.y);
        }
    }

    static ImageMap = {};
    GetImage(){
        if (Visuals.ImageMap[this.imageName]!==undefined){
            return Visuals.ImageMap[this.imageName];
        }
        //create the image
        this.readyToDraw = false;
        let thisBodyVis = this;
        Visuals.ImageMap[this.imageName] = loadImage(this.imageName, function(){thisBodyVis.readyToDraw = true;});
        return Visuals.ImageMap[this.imageName];
    }
}

/* 
___      __    ___
|  \    /  \   |  \   \   /
|   |  /    \  |   \   \ /
|--<  |      | |    |   V
|   |  \    /  |   /    |
|__/    \__/   |__/     |


Body management Functions

*/
class BodyTreeNode{
    constructor(body){
        
        if (body !== undefined) {

            this.body = body;
            this.children = [];

            if (BodyTreeNode.NodeMap[this.body.name] === undefined){
                BodyTreeNode.NodeMap[this.body.name] = this;
                this.AddToParent()
            }
            else{
                let existingPrototype = BodyTreeNode.NodeMap[this.body.name];
                if (existingPrototype.body === undefined){
                    //fill in empty tree node
                    existingPrototype.body = this;
                    existingPrototype.AddToParent();
                }
                else{
                    console.log("ERROR: Two bodies have the same name: '"+this.body.name+"'. This is not allowed.");
                }
            }
        }
        else{
            //prototype
            this.children = [];
        }
    }

    AddChild(TreeNode){
        this.children.push(TreeNode);
    }

    AddToParent(){
        let parentName = this.body.parent;
        if (parentName !== undefined){
            if (BodyTreeNode.NodeMap[parentName] === undefined){
                //create prototype parent
                BodyTreeNode.NodeMap[parentName] = new BodyTreeNode();
            }
            else{
                BodyTreeNode.NodeMap[parentName].AddChild(this);
            }
        }
        else{
            //root body
            BodyTreeNode.Roots.push(this);
        }
    }

    IterateToList(List, Map){
        //first, check if we are not a prototype.
        //prototypes cannot be added
        //also ensure that we have not visited this node before. No infinite recursion here.
        if (this.body !== undefined && this.visited === undefined){
            //mark as visited
            this.visited = true;
            //add body to the list and its index to the map
            Map[this.body.name] = (List.push(this.body)-1);

            //sort children
            this.children.sort(function(p1, p2){
                if (p1.body.priority < p2.body.priority){
                    return 1;
                }
                else if (p1.body.priority > p2.body.priority){
                    return -1;
                }
                else{
                    let v = p1.body.semiMajorAxis - p2.body.semiMajorAxis
                    return Math.sign(v);
                }
            })

            //iteratively add all children
            for(let i=0;i<this.children.length;i++){
                this.children[i].IterateToList(List, Map);
            }
        }
    }

    static Roots = [];
    static NodeMap = {};
    
    static BuildSortedList(List, Map){
        for (let i=0;i<BodyTreeNode.Roots.length;i++){
            BodyTreeNode.Roots[i].IterateToList(List, Map);
        }
    }
}

class Body {
    constructor(primitive, name_rand, last_loaded_body_count, increment){
        if (primitive === undefined){
            this.name = "Invalid Body";
            this.mass = 1;
            this.radius = 1;
            this.pos = createVector(0,0);
            this.worldpos = createVector(0,0);
            this.color=color(255,255,255);
            this.type=undefined; //undefined type is marker for invalid body
            this.parent=undefined;
            this.anomaly=0;
            this.eccentricity=0;
            this.semiMajorAxis=0;
            this.pathWeight=1;
            this.baseAngle=0;
            this.href=undefined;
            this.desc=undefined;
            return;
        }
    
        //body parent
        let interp = name_rand(); //ensure parallelity
        if (typeof (primitive.parent) === "string"){
            this.parent = Body.BuildParent(interp, primitive.parent, last_loaded_body_count)
        }
        else{
           this.parent = undefined;
        }
    
        //body name
        if (typeof (primitive.name) === "string"){
            this.name = Body.BuildName(name_rand, primitive.name, this.parent, increment);
            let count = 0;
            while (Body.Map[this.name] !== undefined && count < 100){
                //generate a new name from the body cause this one exists.
                this.name = Body.BuildName(name_rand, primitive.name, this.parent, increment);
                count++;
            }
        }
        else{
            console.log("Unable to create a random body with a malformed name primitive");
            return;
        }

        //build local random generator instance based off of the body name
        let hash = cyrb128(this.name);
        if (primitive.seed){
            //let the seed affect the body too
            let seedHash = cyrb128(primitive.seed);
            hash[0] = seedHash[0];
            hash[2] = seedHash[2];
        }
        let rand = sfc32(hash[0], hash[1], hash[2], hash[3]);
        
    
        //required fields
        //each of these consumes exactly 1 random nubmer
        Body.TransferField(this, primitive, rand, "mass", 100, false);
        Body.TransferField(this, primitive, rand, "radius", 1, false);
        Body.TransferField(this, primitive, rand, "radius", 1, false);
        Body.TransferField(this, primitive, rand, "anomaly", 0, false);
        this.anomaly = radians(this.anomaly);
        Body.TransferField(this, primitive, rand, "eccentricity", 0, false);
        Body.TransferField(this, primitive, rand, "baseAngle", 0, false);
        this.baseAngle = radians(this.baseAngle);
        Body.TransferField(this, primitive, rand, "href", "", false, true);
        Body.TransferField(this, primitive, rand, "pathWeight", 1, false, true);
        Body.TransferField(this, primitive, rand, "selectable", true, false, false);
        
        //gm stuff
        Body.TransferField(this, primitive, rand, "gmhidden", false, false);
        rand(); //compensate for a removed transfer field.
        if (typeof (primitive.gmnote) === "string"){
            this.gmnotes = [primitive.gmnote];
        }

        //SemiMajorAxis is a bit more difficult - incremental body creation
        interp = rand(); //re-define. Consume exactly 1 random number.
        if (typeof (primitive.semiMajorAxis) == "number"){
            this.semiMajorAxis = primitive.semiMajorAxis;
        }
        else if (
            typeof (primitive.semiMajorAxis) == "object" && 
            typeof (primitive.semiMajorAxis[0]) == "number" && 
            typeof (primitive.semiMajorAxis[1]) == "number"
        ){
            if (primitive.incremental === true){
                //scale
                let alpha = pow(interp, 4);
                let inc_max = Infinity;
                let inc_min = 0;
                if (typeof (primitive.incremental_max) === "number"){
                    inc_max = primitive.incremental_max;
                }
                if (typeof (primitive.incremental_min) === "number"){
                    inc_min = primitive.incremental_min;
                }
                if (inc_max < inc_min){
                    console.log("Looks like your incremental max and min are flipped! Please resolve this.");
                    let p = inc_max;
                    inc_max = inc_min;
                    inc_min = inc_max;
                }
    
                //calculate and clamp the delta
                let axisDelta = lerp(primitive.semiMajorAxis[0], primitive.semiMajorAxis[1], alpha) - primitive.semiMajorAxis[0];
                axisDelta = min(max(axisDelta, inc_min), inc_max);
                
                //set semiMajorAxis
                this.semiMajorAxis = min(primitive.semiMajorAxis[0] + axisDelta, primitive.semiMajorAxis[1]);
    
                //update the lower semiMajorAxis
                primitive.semiMajorAxis[0] = this.semiMajorAxis;
            }
            else{
                //non-incremental
                this.semiMajorAxis = lerp(primitive.semiMajorAxis[0], primitive.semiMajorAxis[1], interp);
            }
        }
        else{
            //default
            this.semiMajorAxis = 0;
        }
    
        //this consumes exactly 3 random numbers
        this.color =InterpretRandomColor(primitive.color, rand);
        if (this.color === undefined){
            //console.log("Random Body Has malformed color: "+primitive.color);
            this.color = color(255,255,255);
        }

        if (primitive.visuals !== undefined){
            //using visuals
            //this is a bit different than older body draw styles.

            //since we don't know how many visuals there are at compile time,
            //use a separate random number generator.
            //notice the disordering of the hash numbers.
            let vrand = sfc32(hash[2], hash[0], hash[3], hash[1]);

            //build the visuals
            this.visuals = [];
            for (let i=0;i<primitive.visuals.length;i++){
                let prim_vis = primitive.visuals[i];
                let vis = new Visuals(prim_vis, vrand);
                if (vis.form < EVisualForm.LENGTH){
                    this.visuals.push(vis);
                }
            }
        }
    
        //handle position. Several possible layouts
        interp = [rand(), rand()]; //re-define. Consume exactly 2 random numbers.
        if (typeof (primitive.pos) == "object"){
            let p1 = {x:0,y:0};
            let p2 = {x:0,y:0};
            let needs_rand_pos = false;
            if (typeof (primitive.pos.length) == "number" && primitive.length > 1){
                //array of two positions
                needs_rand_pos = true;
                if (typeof (primitive.pos[0].x) === "number"){p1.x = primitive.pos[0].x;}
                if (typeof (primitive.pos[0].y) === "number"){p1.y = primitive.pos[0].y;}
                if (typeof (primitive.pos[1].x) === "number"){p1.x = primitive.pos[0].x;}
                if (typeof (primitive.pos[1].y) === "number"){p1.y = primitive.pos[0].y;}
            }
            else{
                //assume two positions with x, y possibly arrays
                if (typeof (primitive.pos.x) === "number"){p1.x = primitive.pos.x; p2.x = primitive.pos.x;}
                else if (typeof (primitive.pos.x) === "object" && primitive.pos.x.length > 1){
                    p1.x = primitive.pos.x[0];
                    p2.x = primitive.pos.x[1];
                    needs_rand_pos = true;
                }
                
                if (typeof (primitive.pos.y) === "number"){p1.y = primitive.pos.y; p2.y = primitive.pos.y;}
                else if (typeof (primitive.pos.y) === "object" && primitive.pos.y.length > 1){
                    p1.y = primitive.pos.y[0];
                    p2.y = primitive.pos.y[1];
                    needs_rand_pos = true;
                }
            }

            if (needs_rand_pos){
                this.pos = createVector(
                    lerp(p1.x, p2.x, interp[0]),
                    lerp(p1.y, p2.y, interp[1]),
                );
            }
            else{
                this.pos = createVector(p1.x, p1.y);
            }
        }
        else if (typeof (primitive.pos) == "string"){
            if (primitive.pos == "in_parent_radius"){
                //create a vector within the radius of the parent body
                let parent_body = this.GetParent();
                if (parent_body !== undefined){
                    this.pos = polar_to_rect(interp[0] * parent_body.radius/2, interp[1]* (Math.PI*2));
                }
            }
        }
        else{
            this.pos = createVector(0,0);
        }
        if (this.pos === undefined){
            this.pos = createVector(0,0);
        }

        //update worldpos to valid value
        this.worldpos = createVector(this.pos.x, this.pos.y);

        //body desc
        if (typeof (primitive.desc) === "string"){
            //like visuals, no compile-time control of how many random numbers are generated.
            //thus, the Desc uses its own random number generator.
            this.desc = Body.BuildDesc(sfc32(hash[1], hash[2], hash[0], hash[3]), primitive.desc, this)
        }
        else{
            this.desc = undefined;
        }

        if (primitive.append_orbit_to_desc){
            this.desc = ""+this.desc+
                "\n\nSemi-Major Axis: " + this.semiMajorAxis +
                "\nEccentricity: " + this.eccentricity +
                "\nbaseAngle: " + this.baseAngle +
                "\nMass: " + this.mass +
                "\nParent: " + this.parent +
                "\nType: " + primitive.type;
        }

        this.priority = 0;
        if (typeof (primitive.priority) === "number"){
            this.priority = primitive.priority;
        }

        //update type to valid value
        this.type = primitive.type;
    }

    //add the body to the lists, update showflags, etc.
    Register(){
        if (this.type === undefined){
            return false;
        }
        let index = Body.List.push(this)-1;
        Body.Map[this.name] = index;

        //upadate the showflags
        if (Body.TypeMap[this.type] === undefined){
            Body.ShowFlags[this.type]=true;
            Body.TypeMap[this.type] = [index]
            Body.ShowFlagList.push(this.type);
        }
        else{
            //add to the body type map
            Body.TypeMap[this.type].push(index);
        }
        return true;
    }

    //Tick the body
    Update(dTime){
        if (this.parent !== undefined){
            //orbit calculation
            let orbital_radius = 0;
            if (this.semiMajorAxis > 0){
                orbital_radius = calculate_orbital_radius(this.semiMajorAxis, this.eccentricity, this.anomaly); 
                this.pos = polar_to_rect(orbital_radius, this.anomaly);
            }
            
            //worldpos
            let body_abs_pos = createVector(this.pos.x, this.pos.y);
            if (this.baseAngle !== undefined && this.baseAngle !== 0) {
                body_abs_pos.rotate(this.baseAngle)
            }
            
            //calculate orbital speed
            let parent_body = this.GetParent();
            if (parent_body !== undefined && 
                parent_body.VerifyWorldPos()
                ){
                    //velocity calculations
                    if (!bIsPaused && this.semiMajorAxis > 0){
                        let angular_velocity = sqrt(G*parent_body.mass / pow(orbital_radius, 3));
                        this.anomaly = (this.anomaly + angular_velocity * (dTime/1000*SimulationTimeScale)) % (Math.PI*2);
                    }
                    
                    //worldpos updates
                    body_abs_pos.add(createVector(parent_body.worldpos.x, parent_body.worldpos.y));
            }
            this.worldpos = createVector(body_abs_pos.x, body_abs_pos.y);
        }
    }

    //Draw the body
    Draw(dTime){
        //draw planet, if its shown
        if (this.IsVisible() && this.IsOnScreen()){
            push();
            
            //get parent location if necessary
            let parentPos = createVector(0,0);
            let parentBody = this.GetParent();
            if (parentBody !== undefined && parentBody.VerifyWorldPos()){
                parentPos = createVector(parentBody.worldpos.x, parentBody.worldpos.y);
            }

            translate(parentPos.x, parentPos.y);
            if (this.baseAngle !== undefined){
                rotate(this.baseAngle);
            }
          
            //draw orbital path
            if (this.semiMajorAxis > 0){
                noFill();
                
                //this.color is p4 color object ONLY
                stroke(red(this.color), green(this.color), blue(this.color), 64) 
    
                if (this.pathWeight !== undefined){
                    strokeWeight(this.pathWeight);
                }
                else{
                    strokeWeight(1);  
                }
                beginShape();
                let lastpoint_quad = undefined;
                let lastpoint = undefined;
                for (let j=0;j<501;j++){
                    let t1 = ((j%501)/500) * (Math.PI*2);
                    
                    let r1 = calculate_orbital_radius(this.semiMajorAxis, this.eccentricity, t1);
                    
                    let p1 = polar_to_rect(r1, t1);

                    
                    //realy only draw what is on screen for optimization
                    //does lead to a bug when zoomed in super close, where the orbit line get a dog leg in it.
                    let quad = Cam.GetPointQuadrant(
                        p5.Vector.add(p5.Vector.rotate(p1, this.baseAngle), parentPos)
                    );
                    if (lastpoint_quad !== undefined){
                        if (quad !== 0 && quad === lastpoint_quad){
                            lastpoint = p1.copy();
                            continue;
                        }
                        else if (quad === 0 && lastpoint_quad !== 0) {
                            vertex(lastpoint.x, lastpoint.y);
                        }
                    }
                    
                    lastpoint_quad = quad;
                    lastpoint = p1.copy();
                    vertex(p1.x, p1.y);
                }
                endShape();
            }
            
            
            //remove rotation for the body name
            push();
            translate(this.pos.x, this.pos.y);
            if (this.baseAngle !== undefined){
                rotate(-this.baseAngle);
            }
            
            //draw planet on top of orbit
            if (this.visuals === undefined){
                noStroke();
                fill(this.color);
                circle(0, 0, this.radius);
            }
            else{
                for (let i=0;i<this.visuals.length;i++){
                    this.visuals[i].Draw(dTime, createVector(0,0), 0, this.radius);
                }
            }
            
            //draw body name
            textAlign(CENTER, BOTTOM);
            let text_size = this.radius;
            if (this.textScale !== undefined){
                text_size *= this.textScale;
            }
            textSize(text_size);
            strokeWeight(text_size*0.01);
            fill(red(this.color), green(this.color), blue(this.color), 64);
            stroke(red(this.color), green(this.color), blue(this.color), 64);
            text(this.GetDisplayName(), 0, -this.radius);

            pop();
            pop();
        }
    }

    IsOnScreen(){
        if (this.parent !== undefined){
            let parent = Body.List[Body.Map[this.parent]];
            if (parent === undefined || parent.worldpos === undefined){
                return true; //assume true if invalid parent
            }
            if (this.semiMajorAxis === undefined || this.semiMajorAxis === 0){
                return Cam.IsPointOnScreen(this.worldpos);
            }
            let furthest_radius = calculate_orbital_radius(this.semiMajorAxis, this.eccentricity, Math.PI) + this.radius;
            let nearest_radius = SIN45 * calculate_orbital_radius(this.semiMajorAxis, this.eccentricity, 0) - this.radius;
            return Cam.IsRectOnScreen(
                {x:parent.worldpos.x - furthest_radius, y:parent.worldpos.y - furthest_radius},
                {x:parent.worldpos.x + furthest_radius, y:parent.worldpos.y + furthest_radius}
            ) && ! Cam.IsScreenWithin( //inner rect
                {x:parent.worldpos.x - nearest_radius, y:parent.worldpos.y - nearest_radius},
                {x:parent.worldpos.x + nearest_radius, y:parent.worldpos.y + nearest_radius}
            )
        }
        else{
            return Cam.IsRectOnScreen(
                {x: this.worldpos.x - this.radius, y: this.worldpos.y - this.radius},
                {x: this.worldpos.x + this.radius, y: this.worldpos.y + this.radius}
            )
        }
    }

    IsVisible(){
        let i = Body.Map[this.name];
        if (this.radius * Cam.scale < 1 && i !== FocusIndex && 1 !== SelectedIndex && i !== SelectedIndexLock){
            return false;
        }
        //hide GM only bodies
        if (!IsGMView && this.gmhidden){
            return false;
        }
        return (Body.ShowFlags[this.type] === true);
    }

    IsSelectable(){
        //hide GM only bodies
        if (!IsGMView && this.gmhidden){
            return false;
        }
        return this.selectable;
    }

    GetDescription(){
        if (this.cachedDesc !== undefined){
            return this.cachedDesc;
        }

        let desc = "";
        if (IsGMView){
            if (this.gmhidden){
                desc = "[Hidden from Players]\n";
            }
        }
        
        //main description
        desc = desc + this.desc 
        
        //notes
        if (this.notes !== undefined && this.notes.length !== undefined){
            desc = desc + "\n\nNotes:"
            for (let i=0;i<this.notes.length;i++){
                desc = desc + "\n" + this.notes[i];
            }
        }

        //gmnotes
        if (IsGMView){
            if (this.gmnotes !== undefined && this.gmnotes.length !== undefined){
                desc = desc + "\n\nGM Notes:";
                for (let i=0;i<this.gmnotes.length;i++){
                    desc = desc + "\n" + this.gmnotes[i];
                }
            }
        }
        
        if (desc === ""){
            desc = "No Data Available!";
        }
        this.cachedDesc = desc;
        return desc;
    }

    GetDisplayName(){
        if (this.DisplayName !== undefined){
            return this.DisplayName;
        }
        return this.name;
    }

    AddNote(Note, IsGMOnly){
        if (typeof Note !== "string"){
            return;
        }

        if (IsGMOnly){
            if (this.gmnotes === undefined){
                this.gmnotes = [Note];
            }
            else{
                this.gmnotes.push(Note);
            }
        }
        else{
            if (this.notes === undefined){
                this.notes = [Note];
            }
            else{
                this.notes.push(Note);
            }
        }
    }

    //Utility Functions
    GetParent(){
        if (this.parent !== undefined){
            let p = Body.List[Body.Map[this.parent]];
            if (p !== undefined){
                return p;
            }
        }
        return undefined
    }

    VerifyWorldPos(){
        return (this.worldpos !== undefined && 
            this.worldpos.x !== undefined && 
            this.worldpos.y !== undefined
        );
    }

    VerifyPos(){
        return (this.pos !== undefined && 
            this.pos.x !== undefined && 
            this.pos.y !== undefined
        );
    }

    //static stuff
    static List = [];
    static Map = {};
    static TypeMap = {};
    static ShowFlags = {};
    static ShowFlagList = [];


    static BuildName(rand, name_primitive, parent, increment){
        let newName = name_primitive.replace(/#/gi, function(x){
            return ""+(Math.floor(rand()*10)%10);
        })
        newName = newName.replace(/\$/gi, function(x){
            return ""+((Math.floor(rand()*9)%9)+1);
        })
        newName = newName.replace(/\[parent\]/gi, function(x){
            return ""+parent;
        })
        newName = newName.replace(/{([a-z]+)}/gi, function(x, y){
            if (NamePart[y] == undefined){
                console.log("ERROR: Unable to us a dynamic name part of: '" +y+"'. Not defined in "+NamePartFilePath);
                return ""+x
            }
            return ""+NamePart[y][Math.floor(rand()*NamePart[y].length)%NamePart[y].length];
        })
        newName = newName.replace(/\[increment\]/gi, function(x){
            return ""+increment;
        })
    
        //ensure always last
        newName = newName.replace(/\[roman:([0-9]+)\]/gi, function(x,y){
            return ""+romanize(parseInt(y));
        })
        return newName;
    }

    static BuildDesc(rand, desc_primitive, body){
        let newDesc = desc_primitive.replace(/{parent}/gi, function(x){
            return ""+body.parent;
        })
        newDesc = newDesc.replace(/{parent}/gi, function(x){
            return ""+body.parent;
        })
        newDesc = newDesc.replace(/{name}/gi, function(x){
            return ""+body.name;
        })
        newDesc = newDesc.replace(/{parent:([0-9]+)}/gi, function(x, y){
            let parentName = body.parent;
            let stepCount = parseInt(y)-1
            let parentBody = Body.List[Body.Map[parentName]];
            while (parentBody !== undefined && stepCount > 0){
                if (parentBody.parent){
                    parentName = parentBody.parent;
                    parentBody = Body.List[Body.Map[parentName]];
                    stepCount--;
                }
                else{
                    parentBody = undefined
                }
            }
            return ""+parentName;
        })
        newDesc = newDesc.replace(/{root}/gi, function(x){
            let parentName = body.parent;
            let parentBody = Body.List[Body.Map[parentName]];
            while (parentBody !== undefined){
                if (parentBody.parent){
                    parentName = parentBody.parent;
                    parentBody = Body.List[Body.Map[parentName]];
                }
                else{
                    parentBody = undefined
                }
            }
            return ""+parentName;
        })
        newDesc = newDesc.replace(/{eccentricity}/gi, function(x){
            return ""+body.eccentricity;
        })
        newDesc = newDesc.replace(/{semimajoraxis}/gi, function(x){
            return ""+body.semiMajorAxis;
        })
        newDesc = newDesc.replace(/{perigeeangle}/gi, function(x){
            return ""+body.baseAngle;
        })
        newDesc = newDesc.replace(/{mass}/gi, function(x){
            return ""+body.mass;
        })
        newDesc = newDesc.replace(/{radius}/gi, function(x){
            return ""+body.radius;
        })

        let did_perform_replacement = true
        while(did_perform_replacement === true){
            did_perform_replacement = false;
            newDesc = newDesc.replace(/\[([^\[\]]+)\]/gi, function(x, partstring){
                did_perform_replacement = true;
                let parts = partstring.split("|");
                return ""+parts[Math.floor(rand()*parts.length)%parts.length];
            })
        }
    
    
        return newDesc;
    }

    static BuildParent(interp, parent_primitive, last_loaded_body_count){
        if (parent_primitive === "{previous}" && Body.List.length >= last_loaded_body_count && last_loaded_body_count > 0){
            if (last_loaded_body_count > 1){
                //pick a random body
                return Body.List[Body.List.length - Math.ceil(interp*last_loaded_body_count)].name;
            }
            else{
                //pick last body is BodyList
                return Body.List[Body.List.length-1].name;
            }
        }
        for (let i=0;i<Body.ShowFlagList.length;i++){
            let type = Body.ShowFlagList[i]
            if (parent_primitive === ("{"+type+"}")){
                //using a type for a parent. Pick any body of that type
                return ""+Body.List[ Body.TypeMap[type][Math.floor(interp*Body.TypeMap[type].length)%Body.TypeMap[type].length]].name;
            }
        }
        return parent_primitive;
    }

    static ResetLists(){
        Body.List = [];
        Body.Map = {};
        Body.TypeMap = {};
        Body.ShowFlags = {};
        Body.ShowFlagList = [];
        BodyTreeNode.Roots = [];
        BodyTreeNode.NodeMap = {};
    }

    //Transfer a field to the body from the primitive.
    //guaranteed to consume 1 and only 1 random number
    static TransferField(body, primitive, rand, fieldname, default_value, fail_on_invalid, nil_default){
        //eccentricity
        let interp = rand();
        body[fieldname] = GetRandomValueWithDefault(primitive[fieldname], interp, undefined, typeof default_value)
        if (body[fieldname] === undefined){
            //invalid format
            if (nil_default === undefined || nil_default === false){
                body[fieldname] = default_value;
            }
            else{
                body[fieldname] = undefined;
            }
            if (fail_on_invalid){
                console.log("Body unable to meet minimum requirements: Requires: "+fieldname);
                return false;
            }
        }
        return true;
    }

    static NextVisibleBodyIndex(index){
        let i = index + 1;
        while (i < Body.List.length){
            let body = Body.List[i];
            if (Body.ShowFlags[body.type] && body.IsSelectable()){
                return i;
            }
            i++
        }
        return -1;
    }

    static PrevVisibleBodyIndex(index){
        let i = index - 1;
        if (index < 0){
            i = Body.List.length-1;
        }
        while (i > -1){
            let body = Body.List[i];
            if (Body.ShowFlags[body.type] && body.IsSelectable()){
                return i;
            }
            i--
        }
        return -1;
    }

    static DumpAllBodies(){
        console.log(Body.List);
    }

    static SortLists(){
        //build tree
        for (let i=0;i<Body.List.length;i++){
            new BodyTreeNode(Body.List[i]);
        }
        //extract from tree
        Body.List = [];
        Body.Map = {};
        BodyTreeNode.BuildSortedList(Body.List, Body.Map);

        //dont rebuild typemap, just delete it
        //its not needed after body generation is done
        Body.TypeMap = {};
    }

    static InvalidateCachedDesc(){
        for (let i=0;i<Body.List.length;i++){
            Body.List[i].cachedDesc = undefined;
        }
    }
}

/*
___     __            _______  ____   ___
|  \   /  \   |    |     |     |     /    
|__/  |    |  |    |     |     |__   \___ 
| \   |    |  |    |     |     |         \
|  \   \__/   \____/     |     |___   ___/

{
    "start":<bodyname>,
    "end":<bodyname>,
    "color":<Color, as described above. - uses Separate random sequence from bodies, and is not stable.>,
    "thickness":<number, path thickness>,
    "style":<one of "line", "dotted">,
    "pattern"=<string, containing '.', '-', "_" and ' '
        "." = a single dot, with its length the same as the line width, seperated from the elements on either side by the line width
        "-" = a single dash, three times as long as the line width, seperated from the elements on either side by the line width
        " " = an empty dash, three times as long as the line width. If the adjacent elements requre a seperator, this counts as part of that.
        "_" = a singel dash, three times as long as the line width. Obeys its neighbors' seperation, but does not seperate from itself.
    "circle_ends":<boolean if true, the start and end bodies have rings around them the width of the line, at a 
            distance of 3X radius, and the line ends in that circle.>,
    "gmhidden"<boolean>,
}
*/

class Route{
    constructor(primitive){
        if(primitive === undefined){
            this.start = undefined;
            this.end = undefined;
            this.color = color(255,255,255,255);
            this.strokeWeight = 1;
            this.style="line";
            this.circle_ends=false;
            this.gmhidden=false;
        }

        //start and end
        if (typeof (primitive.start) !== "string" || typeof (primitive.end) !== "string"){
            return;
        }
        this.start = primitive.start;
        this.end = primitive.end;

        //use random func from body names for stability
        let hash = cyrb128(this.start+this.end);
        let rand = sfc32(hash[0], hash[1], hash[2], hash[3]);

        //color
        this.color = InterpretRandomColor(primitive.color, rand);
        if (this.color === undefined){
            this.color = color(255,255,255,255);
        }
        
        //stroke weight
        if (typeof (primitive.thickness) === "number"){
            this.strokeWeight = primitive.thickness;
        }
        else{
            this.strokeWeight = 1;
        }

        //line style
        if (typeof (primitive.style) === "string" && (primitive.style == "line" || primitive.style == "dotted")){
            this.style = primitive.style;
        }
        else{
            this.style = "line";
        }

        if (this.style == "dotted"){
            let patterstring = "-"
            if (typeof (primitive.pattern) == "string"){
                patterstring = primitive.pattern;
            }
            this.pattern = [];
            let ary = [...patterstring]; //turn string into char array
            let need_sep = false;
            for(let i=0;i<ary.length;i++){
                let char = ary[i];
                switch(char){
                    case "." : {
                        if (i !== 0){
                            this.pattern.push(-1);
                        }
                        this.pattern.push(1);
                        need_sep = true;
                        break;
                    }
                    case "-" : {
                        if (i !== 0){
                            this.pattern.push(-1);
                        }
                        this.pattern.push(3);
                        need_sep = true;
                        break;
                    }
                    case "_" : {
                        if (need_sep){
                            this.pattern.push(-1);
                        }
                        if (this.pattern[this.pattern.length-1] > 0){
                            this.pattern[this.pattern.length-1]+=3;
                        } 
                        else{
                            this.pattern.push(3);
                        }
                        need_sep = false;
                        break;
                    }
                    case " " : {
                        if (this.pattern[this.pattern.length-1] < 0){
                            this.pattern[this.pattern.length-1]-=3;
                        } 
                        else{
                            this.pattern.push(-3);
                        }
                        need_sep = false;
                        break;
                    }
                    default:{
                        console.log("Found invalid character: '"+char+"' in dotted line string. Skipping.");
                        break;
                    }
                }
            }
            if (need_sep){
                this.pattern.push(-1);
            }
            //scale all pattern elements
            for(let i=0;i<this.pattern.length;i++){
                this.pattern[i] *= this.strokeWeight;
            }
            //pattern built
        }

        this.circle_ends = false;
        if (primitive.circle_ends){
            this.circle_ends = true;
        }
    
        this.gmhidden = false;
        if (primitive.gmhidden){
            this.gmhidden=true;
        }

        this.drawAfterBodies = false;
        if (primitive.draw_after_bodies){
            this.drawAfterBodies=true;
        }
    }

    Register(){
        if (this.IsValid()){
            Route.List.push(this);
        }
    }

    IsValid(){
        if (this.start === undefined || this.end === undefined){
            return false;
        }
        if (Body.Map[this.start] === undefined || Body.Map[this.end] === undefined){
            return false;
        }
        if (Body.List[Body.Map[this.start]] === undefined || Body.List[Body.Map[this.end]] === undefined){
            return false;
        }
        return true;
    }

    IsVisible(){
        //hide if either body is hidden
        if (Body.List[Body.Map[this.start]].IsVisible() && Body.List[Body.Map[this.end]].IsVisible()){
            if (this.gmhidden){
                return IsGMView;
            }
            return true;
        }
        return false; 
    }

    Draw(deltaTime){
        let distance_offset_start = 0;
        let distance_offset_end = 0;
        let body1 = Body.List[Body.Map[this.start]];
        let body2 = Body.List[Body.Map[this.end]];
        let direction_vec = (body2.worldpos.copy()).sub(body1.worldpos).normalize();

        push();
        stroke(this.color);
        noFill();
        strokeWeight(this.strokeWeight);
        strokeCap(ROUND);

        if (this.circle_ends){
            //circle around first body
            circle(
                body1.worldpos.x,
                body1.worldpos.y,
                body1.radius * 3
            );
            distance_offset_start = (body1.radius/2)*3;
            circle(
                body2.worldpos.x,
                body2.worldpos.y,
                body2.radius * 3
            );
            distance_offset_end = (body2.radius/2)*3;
        }

        
        if (this.style === "line"){
            let startpoint = p5.Vector.add(body1.worldpos, p5.Vector.mult(direction_vec, distance_offset_start));
            let endpoint = p5.Vector.sub(body2.worldpos, p5.Vector.mult(direction_vec, distance_offset_end));
            line(startpoint.x, startpoint.y, endpoint.x, endpoint.y);
        }
        else{
            beginShape(LINES);
            let target_dist = p5.Vector.dist(body1.worldpos, body2.worldpos) - distance_offset_end; //start taken into account.
            let dist_offset = distance_offset_start;
            let i = 0;
            while (dist_offset < target_dist){
                let dist = this.pattern[i];
                if (dist < 0){
                    //dealing with a space
                    dist_offset += Math.abs(dist)+this.strokeWeight;
                }
                else{
                    //dealing with a dash
                    let length = dist-this.strokeWeight;
                    //calculate start and end
                    let startpoint = p5.Vector.add(body1.worldpos, p5.Vector.mult(direction_vec, dist_offset));
                    let endpoint = p5.Vector.add(body1.worldpos, p5.Vector.mult(direction_vec, Math.min(dist_offset+length, target_dist)));
                    vertex(startpoint.x, startpoint.y);
                    vertex(endpoint.x, endpoint.y);
                    //update distance offset
                    dist_offset += length;
                }
                i = (i+1)%this.pattern.length;
            }
            endShape();
        }

        pop();
    }



    static List = [];
}


/*
____               ____           ____   ___     __                   ____
|   \     /\      /    \  |  /   /    \  |  \   /  \   |    | |\   |  |   \
|---<    /  \    |        |_/   |   ___  |__/  |    |  |    | | \  |  |    |
|   |   /----\   |        | \   |     |  | \   |    |  |    | |  \ |  |    |
|___/  /      \   \____/  |  \   \____/  |  \   \__/   \____/ |   \|  |___/

*/

function ParseBackgroundDefinition(def){
    let hash = cyrb128(MapSeed);
    let rand = sfc32(hash[0], hash[3], hash[2], hash[1]);

    //deal with stars
    if (def.stars){
        Background.stars = {
            count:100,
            parallax:[0,0],
            colors:["#808080", "#FFFFFF"]
        }

        if (typeof (def.star_count) === "number"){
            Background.stars.count = [def.star_count,0]
        }
        else if (typeof (def.star_count) === "object" && def.star_count.length === 2){
            Background.stars.count = [def.star_count[0], def.star_count[1]];
        }

        if (typeof (def.star_color) === "object" && def.star_color.length === 2){
            Background.stars.colors=[color(def.star_color[0]), color(def.star_color[1])];
        }
    }

    if (def.elements !== undefined && def.elements.length > 0){
        //visual elements
        for (let i=0;i<def.elements.length;i++){
            let elm = def.elements[i];
            //do the base Visuals stuff 
            let vis = new Visuals(elm, rand);

            //if valid, add on the other elements
            if (vis.form < EVisualForm.LENGTH){
                let interp = rand();
                vis.parallax = GetRandomValueWithDefault(elm.parallax, interp, 1)

                //position
                interp = [rand(), rand()]; //re-define. Consume exactly 2 random numbers.
                if (typeof (elm.pos) == "object"){
                    let p1 = {x:0,y:0};
                    let p2 = {x:0,y:0};
                    let needs_rand_pos = false;
                    if (typeof (elm.pos.length) == "number" && elm.length > 1){
                        //array of two positions
                        needs_rand_pos = true;
                        if (typeof (elm.pos[0].x) === "number"){p1.x = elm.pos[0].x;}
                        if (typeof (elm.pos[0].y) === "number"){p1.y = elm.pos[0].y;}
                        if (typeof (elm.pos[1].x) === "number"){p1.x = elm.pos[0].x;}
                        if (typeof (elm.pos[1].y) === "number"){p1.y = elm.pos[0].y;}
                    }
                    else{
                        //assume two positions with x, y possibly arrays
                        if (typeof (elm.pos.x) === "number"){p1.x = elm.pos.x; p2.x = elm.pos.x;}
                        else if (typeof (elm.pos.x) === "object" && elm.pos.x.length > 1){
                            p1.x = elm.pos.x[0];
                            p2.x = elm.pos.x[1];
                            needs_rand_pos = true;
                        }

                        if (typeof (elm.pos.y) === "number"){p1.y = elm.pos.y; p2.y = elm.pos.y;}
                        else if (typeof (elm.pos.y) === "object" && elm.pos.y.length > 1){
                            p1.y = elm.pos.y[0];
                            p2.y = elm.pos.y[1];
                            needs_rand_pos = true;
                        }
                    }

                    if (needs_rand_pos){
                        this.pos = createVector(
                            lerp(p1.x, p2.x, interp[0]),
                            lerp(p1.y, p2.y, interp[1]),
                        );
                    }
                    else{
                        vis.pos = createVector(p1.x, p1.y);
                    }
                }
                else{
                    //not a good visual, no position
                    console.log("Visuals for background elements need a valid position")
                    continue;
                }

                //angle
                interp = rand();
                vis.angle = GetRandomValueWithDefault(elm.angle, interp, 0);
                
                //size
                interp = rand();
                vis.size = GetRandomValueWithDefault(elm.size, interp, 1);

                Background.elements.push(vis);
            }
        }
    }
}

function DrawBGElement(element, dtime){
    Cam.PreDraw(element.parallax);
    element.Draw(dtime, element.pos, element.angle, element.size);
    Cam.PostDraw();
}

function star(x, y, size, col){
    noStroke();
    fill(col);
    circle(x,y,size);
}

function starry_sky(seed){
    if (Background.stars === undefined){
        return;
    }

    let hash = cyrb128(seed);
    let rand = sfc32(hash[0], hash[1], hash[2], hash[3]);
    

    let starCount = lerp(Background.stars.count[0], Background.stars.count[1], rand());

    for (let i=0;i<starCount;i++){
        star(
            rand()*width, 
            rand()*height, 
            rand()*3, 
            [
                lerp(red(Background.stars.colors[0]),   red(Background.stars.colors[1]),    rand()),
                lerp(green(Background.stars.colors[0]), green(Background.stars.colors[1]),  rand()),
                lerp(blue(Background.stars.colors[0]),  blue(Background.stars.colors[1]),   rand())
            ]
        );
    }
}

/*
_____  ____   _____  _____   ___
|      |   \    |      |    /    
|__    |    |   |      |    \___ 
|      |    |   |      |        \
|____  |___/  __|__    |     ___/

Edits to current bodies after they are created.
*/

function ParseEdit(primitive){
    if (typeof (primitive.name) !== "string"){
        return; //invalid edit if no name
    }
    let index = Body.Map[primitive.name];
    if (typeof index !== "number" || index < 0 || index >= Body.List.length){
        return; //invalid name - not a body!
    }

    let body = Body.List[index];

    if (typeof (primitive.display_name) === "string"){
        body.DisplayName = primitive.display_name;
    }

    if (typeof (primitive.note) === "string"){
        body.AddNote(primitive.note, false);
    }

    if (typeof (primitive.gmnote) === "string"){
        body.AddNote(primitive.gmnote, true);
    }
}


/*
                ____
|\  /|    /\    |   \
| \/ |   /  \   |___/
|    |  /----\  |
|    | /      \ |

//map functions
*/

function loadMap(MapFilePath){
    Body.ResetLists();
    bIsPaused = false;
    bShowHelp = false;
    SimulationTimeScale = 1;
    FocusIndex = -1;
    SelectedIndex = -1;
    SelectedIndexLock = -1;
    TimeFromLastClick=0;
    Route.List = [];
    Background={
        elements:[]
    };

    let last_loaded_body_count = 0;

    //load the map JSON object
    mapData = JSON.parse(loadFile(MapFilePath));

    MapSeed = mapData.seed;
    let GlobalHash = cyrb128(MapSeed);
    let GlobalRandomFunc = sfc32(GlobalHash[0], GlobalHash[1], GlobalHash[2], GlobalHash[3]);
    
    //validate and translate bodies
    for (let i=0;i<mapData.bodies.length;i++){
        let primitive = mapData.bodies[i];

        //ensure a name exists! needed for random seeds.
        if (typeof (primitive.name) !== "string" ){
            console.log("ERROR: attempted to load a body without a name!");
            continue;
        }

        //build random bodies
        let name_rand;
        if (typeof (primitive.seed) === "string"){
            let hash = cyrb128(primitive.seed);
            name_rand = sfc32(hash[0], GlobalHash[1], hash[2], GlobalHash[3]); //use both the seed and global seed
        }
        else{
            let hash = cyrb128(primitive.name); //name better be defined!
            name_rand = sfc32(GlobalHash[0], hash[1], GlobalHash[2], hash[3]); //use both the seed and global seed
        }

        //build random config and add bodies
        let count = 1; //by default, make one random body.
        let interp = name_rand(); //ensure rand parallelity between code paths
        if (
            typeof (primitive.count) == "object" && 
            typeof (primitive.count[0]) == "number" && 
            typeof (primitive.count[1]) == "number"
        ){
            count = Math.floor(lerp(primitive.count[0], primitive.count[1], interp));
        }
        else if (typeof (primitive.count) == "number")
        {
            count = Math.floor(primitive.count);
        }
        
        let generated_bodies = [];
        for (let j=0;j<count;j++){
            let proc_body = new Body(primitive, name_rand, last_loaded_body_count, j+1);
            if (proc_body.type === undefined){
                break;
            }
            //append body to list
            generated_bodies.push(proc_body);
        }
        for (let j=0; j<generated_bodies.length; j++){
            generated_bodies[j].Register();
        }
        last_loaded_body_count = generated_bodies.length;
    }

    //sort body lists
    Body.SortLists();

    //clear out showflag UI elements
    for (let i=0;i<ShowFlagUIList.length;i++){
        ShowFlagUIList[i].destroy();
    }
    ShowFlagUIList = [];

    //build routes
    if (mapData.routes !== undefined){
        for (let i=0;i<mapData.routes.length;i++){
            let r = new Route(mapData.routes[i]);
            r.Register(); //auto valid check
        }
    }

    //build background
    if (mapData.background !== undefined){
        ParseBackgroundDefinition(mapData.background)
    }

    //build edits
    if (mapData.edits !== undefined && mapData.edits.length !== undefined){
        for(let i=0;i<mapData.edits.length;i++){
            ParseEdit(mapData.edits[i]);
        }
    }
    
    //Reset Cam
    //set cam scale if provided
    if (typeof (mapData.camScale) == "number"){
        DefaultCamScale = mapData.camScale;
    }
    else{
        DefaultCamScale = 1;
    }
    Cam.LockToBody(undefined);

    return mapData;
}

function loadMapUI(){

    let flag_height = 24;
    let currheight = 40 + (Body.ShowFlagList.length*flag_height);
    for (let i=0;i<Body.ShowFlagList.length;i++){
        //build checkbox
        let flag = Body.ShowFlagList[i];

        let checkbox = new UIElement(24, height-currheight, 16, 16, "Show "+flag, 
            function(){
                Checkbox_Click_Function.call(this);
                Body.ShowFlags[flag] = this.checked;
            }, 
            Checkbox_Draw_Function
        );

        checkbox.checked = true;
        currheight-=flag_height;
        //save to unload later
        ShowFlagUIList.push(checkbox);
    }
}

function loadMapFromIndex(index){
    SystemSelectedIndex = index;
    MapFilePath = SystemList[SystemSelectedIndex].file
    loadMap(MapFilePath);
    loadMapUI();
}

/* 
____   ____
|   \  |
|___/  |__
|         \
|      \__/

// P5 functions
*/

function preload(){
    //load up the names for the maps
    NamePart = JSON.parse(loadFile(NamePartFilePath));
    
    //load the system list
    SystemList = JSON.parse(loadFile(SystemListFilePath)).map_list;

    if (SystemList !== undefined && SystemList.length > 0){
        SystemSelectedIndex = 0;

        MapFilePath = SystemList[SystemSelectedIndex].file
        let mapData = loadMap(MapFilePath);

        if (typeof (mapData.camScale) == "number"){
            Cam.scale = mapData.camScale;
        }
        else{
            Cam.scale = 1;
        }
    }
}

function setup() {
    createCanvas(window.innerWidth-100, window.innerHeight-100);
    frameRate(60);
    
    //UI elements
    //go to page button
    new UIElement(0, 0, 0, 0, "URL Button", URL_Button_Click_Function, URL_Button_Draw_Function);

    //select system dropdown
    new UIElement(0,0,0,0, "SystemDropdown", SystemSelector_Click_Function, SystemSelector_Draw_Function);

    //build showflags
    loadMapUI();
}
 
window.onresize = function(){
    resizeCanvas(window.innerWidth-100, window.innerHeight-100);
}


function draw() {
    //update time from last click
    TimeFromLastClick += (deltaTime / 1000);

    //draw background
    background(20);

    //Background
    starry_sky(MapSeed)
    for (let i=0;i<Background.elements.length;i++){
        DrawBGElement(Background.elements[i], deltaTime);
    }

    
    //update bodies
    for (let i=0;i<Body.List.length;i++){
        //do each planet
        if (!bIsPaused){
            Body.List[i].Update(deltaTime);
        }
    }

    //START CAMERA
    Cam.PreDraw();
    
    //draw routes
    for (let i=0;i<Route.List.length;i++){
        if (Route.List[i].IsVisible() && (!Route.List[i].drawAfterBodies)){
            Route.List[i].Draw(deltaTime);
        }
    }

    //draw bodies
    for (let i=0;i<Body.List.length;i++){
        //do each planet
        if (Body.List[i].IsVisible()){
            Body.List[i].Draw(deltaTime);
        }
    }

    //draw routes
    for (let i=0;i<Route.List.length;i++){
        if (Route.List[i].IsVisible() && Route.List[i].drawAfterBodies){
            Route.List[i].Draw(deltaTime);
        }
    }
    
    //draw and select selected index
    const mouse_pos = Cam.ScreenToWorld(createVector(mouseX, mouseY));
    let maxDistBody = Infinity;
    for(let i=0;i<Body.List.length;i++){
        let body = Body.List[i];
        if (body.worldpos !== undefined && mouse_pos !== undefined && body.IsVisible() && body.IsSelectable()){
            let distBody = p5.Vector.dist(body.worldpos, mouse_pos);
            if (distBody < maxDistBody){
                maxDistBody = distBody;
                SelectedIndex = i;
            }
        }
    }
    
    
    if (SelectedIndex !== -1 && maxDistBody < Body.List[SelectedIndex].radius * SETTING_MAX_SELECT_DIST){
        let body = Body.List[SelectedIndex]
        noFill();
        stroke(SELECTOR_COLOR_ARRAY);
        if (body.pathWeight !== undefined){
            strokeWeight(body.pathWeight);
        }
        else{
            strokeWeight(0.5);
        }

        circle(body.worldpos.x, body.worldpos.y, body.radius * SETTING_MAX_SELECT_DIST * 2);
    }
    else{
        SelectedIndex = -1;
    }
    
    
    //END CAMERA
    Cam.PostDraw();
    
    //CONTROLS
    if (mouseIsPressed){
        //block UI elements click through
        let propToWorld=true;
        if (mouseButton === LEFT){
            let mPos = new p5.Vector(mouseX, mouseY);
            for (let i=0;i<UIElementList.length;i++){
                let elm = UIElementList[i];
                if (elm.isPointIn(mPos)){
                    propToWorld = false;
                }
            }
        }
      
        if (propToWorld){
            //camera movement
            if(mouseButton === CENTER || mouseButton === LEFT){
                let off = new p5.Vector(mouseX - pmouseX, mouseY - pmouseY); //for some reason, movedX and movedY are not accurate.
                Cam.MoveV(off);
            }
        }
    }
    
    //UI
    DrawSelectedUITextBlock();
    
    //UI elements
    //Draw the UI control elements
    for (let i=0;i<UIElementList.length;i++){
        UIElementList[i].draw();
    }
    
    DrawStatsTextBlock();
}
  
//handle camera scaling
function mouseWheel(e){
    if (e.delta > 0){ //zoom out
        Cam.Scale(-1);
    }else{
        Cam.Scale(1);
    }
    return false;
}
  
//handle key events
function keyPressed(){
    if (key === "Escape"){
        let body = Cam.body;
        if (body !== undefined){
            let parent = body.GetParent()
            FocusIndex = -1;
            if (parent !== undefined){
                FocusIndex = Body.Map[parent.name];
            }
            Cam.LockToBody(parent);
        }
    }

    if (key === "]" || key === "ArrowRight"){
        FocusIndex = Body.NextVisibleBodyIndex(FocusIndex);
      
        if (FocusIndex > -1){
            Cam.LockToBody(Body.List[FocusIndex]);
        }
        else{
            Cam.LockToBody(undefined);
        }
    }
    
    if (key === "[" || key === "ArrowLeft"){
        FocusIndex = Body.PrevVisibleBodyIndex(FocusIndex);
        
        if (FocusIndex > -1){
            Cam.LockToBody(Body.List[FocusIndex]);
        }
        else{
            Cam.LockToBody(undefined);
        }

    }

    if (key === "ArrowUp"){
        SystemSelectedIndex = (SystemSelectedIndex+1)%(SystemList.length);
        loadMapFromIndex(SystemSelectedIndex);
    }

    if (key === "ArrowDown"){
        SystemSelectedIndex--;
        if (SystemSelectedIndex < 0){
            SystemSelectedIndex = SystemList.length-1;
        }
        loadMapFromIndex(SystemSelectedIndex);
    }
    
    if (key == "h"){
        //re-lock the camera to reset pos and scale
        Cam.LockToBody(Cam.body);
    }
    
    if (key == "p"){
        //pause the simulation
        bIsPaused = !bIsPaused;
    }
    
    if (key === "+" || key === "="){
        SimulationTimeScale *= 10;
        bIsPaused = false;
    }
    
    if (key === "-"){
        SimulationTimeScale /= 10;
        if (SimulationTimeScale < 0.0001){
            SimulationTimeScale = 0.0001;
            bIsPaused = true;
        }
        else{
            bIsPaused = false;
        }
    }
    
    if (key === "?" || key == "/"){
        bShowHelp = !bShowHelp;
    }
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

        //doubleckick detection
        if (SelectedIndexLock === SelectedIndex && SelectedIndex !== -1 && TimeFromLastClick < DOUBLECLICK_DURATION){
            FocusIndex = SelectedIndex;
            Cam.LockToBody(Body.List[FocusIndex]);
        }
        
        //body selection
        if (mouseButton === LEFT){
            SelectedIndexLock = SelectedIndex;
        }

        TimeFromLastClick = 0;
    }
}