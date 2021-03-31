import "./phaser.js";

const POSITIONS = [
{x:93 ,y:143,link:"../planets/harmony.html"},
{x:151,y:66 ,link:"../planets/veridis.html"},
{x:292,y:56 ,link:"../planets/corilary-major.html"},
{x:308,y:70 ,link:"../planets/corilary-minor.html"},
{x:50 ,y:323,link:"../planets/sparta.html"},
{x:216,y:269,link:"../planets/anthem.html"},
{x:81 ,y:503,link:"../planets/torilia.html"},
{x:98 ,y:525,link:"../planets/oearth.html"},
{x:269,y:475,link:"../planets/hathendrome.html"},
{x:409,y:550,link:"../planets/trupidia.html"},
{x:828,y:457,link:"../planets/korvan.html"},
{x:728,y:507,link:"../planets/ettenweil.html"},
{x:788,y:280,link:"../planets/noctis.html"},
{x:783,y:105,link:"../planets/halcion-cluster.html"},
{x:701,y:201,link:"../planets/terra.html"},
{x:662,y:304,link:"../planets/tel-avan.html"},
{x:533,y:113,link:"../planets/swanheil.html"},
{x:316,y:209,link:"../planets/avalon.html"},
{x:457,y:223,link:"../planets/argile.html"},
{x:413,y:283,link:"../planets/westeress.html"},
{x:478,y:422,link:"../planets/utopos.html"},
{x:602,y:404,link:"../planets/atlantis.html"},
{x:303,y:379,link:"../planets/the-maw.html"},
];

function getNearestStar(loc){
    let minIndex = -1;
    let minDistance = Infinity;
    for(let i=0;i<POSITIONS.length;i++){
        let q = new Phaser.Math.Vector2(POSITIONS[i].x, POSITIONS[i].y);
        let d = q.distance(loc);
        if (d < minDistance){
            minDistance = d;
            minIndex = i;
        }
    }
    if (minDistance < 16){
        return minIndex;
    }else{
        return -1;
    }
}

class Button{
    constructor(Scene, ID, x, y, scale_base){ //TODO: replace color with Image
        this.background = Scene.add.image(x, y, "button_off");
        this.active = false;
        //scale
        this.background.setScale(scale_base);
        //custom properties
        this.background.scale_base = scale_base;
        this.background.button = this;
        this.background.ID = ID;
        
        this.background.setInteractive();
        this.background.on("pointerover", function(){
            this.setScale(1.1 * this.scale_base);
        });
        this.background.on("pointerout", function(){
            this.setScale(1 * this.scale_base);
        });
        this.background.on("pointerup", function(){
            this.setScale(1.1 * this.scale_base);
        });
        this.background.on("pointerdown", function(){
            this.setScale(0.9 * this.scale_base);
            this.button.setActive(!this.button.active);
            this.scene.buttonPress(this.ID);
        });
    }
    setActive(v){
        if (v || v === undefined){
            this.background.setTexture("button_on");
            this.active = true;
        }else{
            this.background.setTexture("button_off");
            this.active = false;
        }
    }
    destroy(){
        this.background.destroy();
    }
}



class MyScene extends Phaser.Scene {
    
    constructor() {
        super();
        
        this.selector = null;
        this.selected_index = -1;
        
        this.background = null;
        this.routes = null;
        this.names = null;
        
        this.clickMode = 0;
        
        
        this.btn_show_routes = null;
        this.btn_show_names = null;
        
    }
    
    preload() {
        this.load.image("button_on", "assets/btn_on.png");
        this.load.image("button_off", "assets/btn_off.png");
        this.load.image("selector", "assets/selector.png");
        
        this.load.image("map", "assets/PlanetMap.png");
        this.load.image("names", "assets/PlanetMap_Names.png");
        this.load.image("routes", "assets/PlanetMap_Routes.png");
    }
    
    create() {
        //build the background
        //this is first to make it on bottom
        this.background = this.add.image(450,300,"map");
        this.background.setScale(6/8);
        
        this.routes = this.add.image(450,300,"routes");
        this.routes.setScale(6/8);
        this.routes.setVisible(false);
        
        this.names = this.add.image(450,300,"names");
        //this.names.setScale(6/8);
        this.names.setVisible(false);
        
        this.selector = this.add.image(0,0, "selector");
        this.selector.setVisible(false);
        
        this.btn_show_routes = new Button(this, "routes", 50, 650, 1.0);
        this.add.text(75, 640, "Show Hyperspace Lanes");
        
        this.btn_show_names = new Button(this, "names", 350, 650, 1.0);
        this.add.text(375, 640, "Show System Names");
        
        //input
        this.input.on("pointerdown", function(){
            let pos = this.scene.input.mousePointer.position.clone();
            if (pos !== null){
                this.scene.mousePress(pos);
            }
        })
        
        this.input.on("pointermove", function(){
            let pos = this.scene.input.mousePointer.position.clone();
            if (pos !== null){
                this.scene.mouseMove(pos);
            }
        })
        
    }
    
    buttonPress(bID){
        //console.log(bID);
        if (bID == "routes"){
            if (this.btn_show_routes.active){
                this.routes.setVisible(true);
            }else{
                this.routes.setVisible(false);
            }
        }else if (bID == "names"){
            if (this.btn_show_names.active){
                this.names.setVisible(true);
            }else{
                this.names.setVisible(false);
            }
        }
    }
    
    mousePress(loc){
        
        if (this.selected_index > -1){
            let url = POSITIONS[this.selected_index].link;
            console.log("here");
            window.location.href = url;
            
        }
    }
    
    mouseMove(loc){
        let index = getNearestStar(loc);
        if (index > -1){
            this.selector.setPosition(POSITIONS[index].x, POSITIONS[index].y)
            this.selector.setVisible(true);
        }else{
            this.selector.setVisible(false);
        }
        this.selected_index = index;
    }
    
    update(time, delta) {
        //
        
    }
}


const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 900,
    height: 700,
    pixelArt: true,
    scene: MyScene,
    physics: { 
        default: 'matter',
        matter: {
            debug: {
                showBody: true,
                showStaticBody: true
            }
        }
    },
});
