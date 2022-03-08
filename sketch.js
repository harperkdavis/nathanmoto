const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Body = Matter.Body,
    Composite = Matter.Composite,
    Constraint = Matter.Constraint,
    World = Matter.World;

let keys = {};

const engine = Engine.create();

let inGame = false;
let inEditor = true;

let game = {
    bodies: [],

    motoBody: undefined,
    motoBackWheel: undefined,
    motoFrontWheel: undefined,

    grounds: [],

    cameraX: 0,
    cameraY: 0,
}

const OBJ_TYPES = {
    NONE: 0,
    STATIC: 1,
    SPAWN_POINT: 2,
    CHECKPOINT: 3,
    END_POINT: 4,
};

const EDIT_TOOLS = {
    SELECT: 0,
    MOVE: 1,
    DELETE: 2,
    PAINT_GROUND: 3,
}

let editor = {
    selecting: false,
    selection: -1,
    
    tool: 0,

    painting: false,
    paintVertices: [],

    selectStart: {x: 0, y: 0},
    selectEnd: {x: 0, y: 0},

    cameraX: 0,
    cameraY: 0,
    cameraZoom: 1,
}

let map = {
    name: "Test Map",
    objects: [
        {
            type: OBJ_TYPES.SPAWN_POINT,
            position: {x: 100, y: -100},
        },
        {
            type: OBJ_TYPES.END_POINT,
            position: {x: 1100, y: -100},
        },
        {
            type: OBJ_TYPES.STATIC,
            vertices: [{x: 0, y: 0}, {x: 100, y: 0}, {x: 100, y: 100}, {x: 0, y: 100}],
        }
    ]
};

function setup() {
    createCanvas(windowWidth, windowHeight);
    document.addEventListener('contextmenu', event => event.preventDefault());
}

function resetWorld() {
    game.bodies = [];
    game.grounds = [];

    World.clear(engine.world);
    Engine.clear(engine);

    engine.world.gravity.y = 0.6;

    game.motoBody = new PhysicsBody(engine.world, Bodies.fromVertices(0, 0, [{x: 20, y: 0}, {x: 80, y: 0}, {x: 85, y: 30}, {x: 15, y: 30}], {friction: 0.0, density: 0.003, frictionAir: 0.0}));
    game.motoBackWheel = new PhysicsBody(engine.world, Bodies.circle(-35, 10, 20, {friction: 1.0, frictionAir: 0.0}));
    game.motoFrontWheel = new PhysicsBody(engine.world, Bodies.circle(35, 10, 20, {friction: 1.0, frictionAir: 0.0}));


    game.motoFrontWheel.body.collisionFilter = {
        'group': 1,
        'category': 0b0001,
        'mask': 0b0001,
    };
    game.motoBackWheel.body.collisionFilter = {
        'group': 1,
        'category': 0b0001,
        'mask': 0b0001,
    };
    game.motoBody.body.collisionFilter = {
        'group': 0,
        'category': 0b0010,
        'mask': 0b0001,
    };

    World.add(engine.world, Constraint.create({
        bodyA: game.motoBody.body,
        bodyB: game.motoBackWheel.body,
        pointA: {x: -35, y: 10},
        length: 0,
        stiffness: 0.15,
    }));

    World.add(engine.world, Constraint.create({
        bodyA: game.motoBody.body,
        bodyB: game.motoFrontWheel.body,
        pointA: {x: 35, y: 10},
        length: 0,
        stiffness: 0.15,
    }));

    game.bodies.push(game.motoBody);
    game.bodies.push(game.motoBackWheel);
    game.bodies.push(game.motoFrontWheel);

    map.objects.forEach(obj => {
        if (obj.type == OBJ_TYPES.STATIC) {
            game.grounds.push(createStatic(obj));
        } else if (obj.type == OBJ_TYPES.SPAWN_POINT) {
            teleportCar(obj.position.x, obj.position.y);

            game.cameraX = obj.position.x;
            game.cameraY = obj.position.y;
        }
    });
    
    
}

function createStatic(obj) {
    let topRight = getVertTopRight(obj.vertices);
    let body = Bodies.fromVertices(0, 0, obj.vertices, {isStatic: true});
    moveToTopRight(body, topRight.x, topRight.y);
    return (new PhysicsBody(engine.world, body));
}

function getVertTopRight(vertices) {
    let minX = Number.MAX_VALUE, minY = Number.MAX_VALUE;
    vertices.forEach(vertex => {
        minX = min(vertex.x, minX);
        minY = min(vertex.y, minY);
    });
    return {x: minX, y: minY};
}

function moveToTopRight(body, x, y) {
    let minX = Number.MAX_VALUE, minY = Number.MAX_VALUE;
    body.vertices.forEach(vertex => {
        minX = min(vertex.x, minX);
        minY = min(vertex.y, minY);
    });
    Body.setPosition(body, {x: -minX + x, y: -minY + y});
}

function teleportCar(x, y) {
    Body.setPosition(game.motoBody.body, {x: x, y: y});
    Body.setPosition(game.motoFrontWheel.body, {x: x + 35, y: y + 10});
    Body.setPosition(game.motoBackWheel.body, {x: x - 35, y: y + 10});
}


function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function getEditorPosition(object) {
    if (object.type == OBJ_TYPES.STATIC) {
        let minX = Number.MAX_VALUE;
        let maxX = -Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let maxY = -Number.MAX_VALUE;
        object.vertices.forEach(vertex => {
            minX = min(minX, vertex.x);
            maxX = max(maxX, vertex.x);
            minY = min(minY, vertex.y);
            maxY = max(maxY, vertex.y);
        });
        return {x: (minX + maxX) / 2, y: (minY + maxY) / 2};
    } else if (object.type == OBJ_TYPES.SPAWN_POINT || object.type == OBJ_TYPES.END_POINT || object.type == OBJ_TYPES.CHECKPOINT) {
        return object.position;
    }
}

function update() {
    Object.keys(keys).forEach(key => {
        if (keys[key] >= 0) {
            keys[key] += 1;
        }
    });

    if (inGame) {
        updateGame();
    } else if (inEditor) {
        updateEditor();
        resetWorld();
    }
}

function updateGame() {

    Engine.update(engine, 1000 / 60);

    game.cameraX = lerp(game.cameraX, game.motoBody.body.position.x, 0.1);
    game.cameraY = lerp(game.cameraY, game.motoBody.body.position.y, 0.1);


    if (keys[UP_ARROW] >= 0 || keys[87] >= 0) {
        Body.setAngularVelocity(game.motoBackWheel.body, game.motoBackWheel.body.angularVelocity + 0.01);
        Body.setAngularVelocity(game.motoFrontWheel.body, game.motoFrontWheel.body.angularVelocity + 0.005);
    }
    if (keys[DOWN_ARROW] >= 0 || keys[83] >= 0) {
        Body.setAngularVelocity(game.motoBackWheel.body, game.motoBackWheel.body.angularVelocity - 0.01);
        Body.setAngularVelocity(game.motoFrontWheel.body, game.motoFrontWheel.body.angularVelocity - 0.005);
    }
    if (keys[LEFT_ARROW] >= 0 || keys[65] >= 0) {
        Body.setAngularVelocity(game.motoBody.body, game.motoBody.body.angularVelocity - 0.001);
    }
    if (keys[RIGHT_ARROW] >= 0 || keys[68] >= 0) {
        Body.setAngularVelocity(game.motoBody.body, game.motoBody.body.angularVelocity + 0.001);
    }
    if (keys[82] == 1) {
        resetWorld();
    }

    if (keys[ENTER] == 1) {
        inEditor = true;
        inGame = false;
    }
}

function switchTool(tool) {
    if (tool < 0) {
        tool = 0;
    } else if (tool > 9) {
        tool = 9;
    }
    editor.tool = tool;
    editor.painting = false;
    editor.paintVertices = [];
}

function updateEditor() {
    if (keys[82] == 1) {
        console.log('reset');
        editor.cameraX = 0;
        editor.cameraY = 0;
        editor.cameraZoom = 1;
    }

    if (editor.selecting) {
        editor.selectEnd = toWorld(mouseX, mouseY);
    }

    if (keys[UP_ARROW] >= 0 || keys[87] >= 0) {
        editor.cameraY += 10 / editor.cameraZoom;
    }
    if (keys[DOWN_ARROW] >= 0 || keys[83] >= 0) {
        editor.cameraY -= 10 / editor.cameraZoom;
    }
    if (keys[LEFT_ARROW] >= 0 || keys[65] >= 0) {
        editor.cameraX += 10 / editor.cameraZoom;
    }
    if (keys[RIGHT_ARROW] >= 0 || keys[68] >= 0) {
        editor.cameraX -= 10 / editor.cameraZoom;
    }

    if (keys[ENTER] == 1) {
        inEditor = false;
        inGame = true;
    }

    if (keys[48] == 1) {
        switchTool(9);
    }
    if (keys[49] == 1) {
        switchTool(0);
    }
    if (keys[50] == 1) {
        switchTool(1);
    }
    if (keys[51] == 1) {
        switchTool(2);
    }
    if (keys[52] == 1) {
        switchTool(3);
    }
}

function mouseDragged() {
    if (inEditor) {
        if (mouseButton == RIGHT) {
            editor.cameraX += (mouseX - pmouseX) / editor.cameraZoom;
            editor.cameraY += (mouseY - pmouseY) / editor.cameraZoom;
        }
    }
}

function toWorld(x, y) {
    return {x: (x - width / 2) / editor.cameraZoom - editor.cameraX, y: (y - height / 2) / editor.cameraZoom - editor.cameraY};
}

function selectVec() {
    if (editor.selecting) {
        return {x: editor.selectEnd.x - editor.selectStart.x, y: editor.selectEnd.y - editor.selectStart.y};
    }
    return {x: 0, y: 0};
}

function mousePressed() {
    if (inEditor) {
        const mouseWorld = toWorld(mouseX, mouseY);
        if (mouseButton == LEFT) {
            if (!(mouseX < 60 || (mouseX > width - 300 && mouseY < 400))) {
                if (editor.tool == EDIT_TOOLS.SELECT || editor.tool == EDIT_TOOLS.MOVE || editor.tool == EDIT_TOOLS.DELETE) {
                    if (!editor.selecting) {
                        for (let i = 0; i < map.objects.length; i++) {
                            let obj = map.objects[i];
                            let pos = getEditorPosition(obj);
                            if (dist(pos.x, pos.y, mouseWorld.x, mouseWorld.y) < 20) {
                                if (editor.tool == EDIT_TOOLS.MOVE || editor.tool == EDIT_TOOLS.SELECT) {
                                    editor.selecting = true;
                                    editor.selection = i;
                                    editor.selectStart = mouseWorld;
                                } else if (editor.tool == EDIT_TOOLS.DELETE) {
                                    obj.deleteMe = true;
                                }
                            }
                        }
                        map.objects = map.objects.filter(obj => {
                            if (obj.deleteMe !== undefined) {
                                if (obj.type == OBJ_TYPES.STATIC || obj.type == OBJ_TYPES.CHECKPOINT) {
                                    return false;
                                }
                            }
                            return true;
                        });
                    } else {
                        if (editor.tool == EDIT_TOOLS.MOVE) {
                            let sv = selectVec();
                            let obj = map.objects[editor.selection];
                            if (obj.type == OBJ_TYPES.STATIC) {
                                obj.vertices.forEach(ver => {
                                    ver.x += sv.x;
                                    ver.y += sv.y;
                                });
                            } else if (obj.type == OBJ_TYPES.SPAWN_POINT || obj.type == OBJ_TYPES.CHECKPOINT || obj.type == OBJ_TYPES.END_POINT) {
                                obj.position.x += sv.x;
                                obj.position.y += sv.y;
                            }
                        }
                        editor.selecting = false;
                    } 
                } else if (editor.tool == EDIT_TOOLS.PAINT_GROUND) {
                    if (!editor.painting) {
                        editor.painting = true;
                        editor.paintVertices.push({...mouseWorld});
                    } else {
                        let prevVertex = editor.paintVertices[editor.paintVertices.length - 1];
                        let firstVertex = editor.paintVertices[0];
                        if (dist(prevVertex.x, prevVertex.y, mouseWorld.x, mouseWorld.y) > 10 && dist(firstVertex.x, firstVertex.y, mouseWorld.x, mouseWorld.y) > 10) {
                            editor.paintVertices.push({...mouseWorld});
                        } else {
                            editor.painting = false;
                            if (editor.paintVertices.length >= 3) {
                                map.objects.push({
                                    type: OBJ_TYPES.STATIC,
                                    vertices: [...editor.paintVertices]
                                });
                            }
                            editor.paintVertices = [];
                        }
                        
                    }
                }
            } else {
                if (mouseX < 60) {
                    if (mouseY > 10 && mouseY < 510) {
                        switchTool(floor((mouseY - 10) / 50));
                    }
                }
            }
        }
    }
}

function mouseWheel(e) {
    if (inEditor) {
        const delta = e.delta > 0 ? 1.05 : 1 / 1.05;
        editor.cameraZoom *= delta;
        if (editor.cameraZoom < 0.1) {
            editor.cameraZoom = 0.1;
        } else if (editor.cameraZoom > 4) {
            editor.cameraZoom = 4;
        }
    }
}

function keyPressed() {
    keys[keyCode] = 0;
}
  
function keyReleased() {
    keys[keyCode] = -1;
}

function draw() {
    update();
    background(250);

    if (inGame) {
        drawGame();
    } else if (inEditor) {
        drawEditor();
    }
}

function drawGame() {
    push();
    translate(-game.cameraX + width / 2, -game.cameraY + height / 2);
    fill(255);
    stroke(0);

    game.motoBody.draw();
    game.motoBackWheel.draw();
    game.motoFrontWheel.draw();

    line(game.motoBackWheel.body.position.x, game.motoBackWheel.body.position.y, game.motoBackWheel.body.vertices[0].x, game.motoBackWheel.body.vertices[0].y);
    line(game.motoFrontWheel.body.position.x, game.motoFrontWheel.body.position.y, game.motoFrontWheel.body.vertices[0].x, game.motoFrontWheel.body.vertices[0].y);

    fill(200);
    game.grounds.forEach(gro => {
        gro.draw();
    });

    pop();

    fill(0);
    noStroke();
    textSize(16);
    textAlign(LEFT, TOP);
    text("nathan motorcycle or something idk", 16, 16);
    text("enter to return to editor. r to restart. pos: " + game.motoBody.body.position.x + ", " + game.motoBody.body.position.y, 16, 32);
}

function drawEditor() {
    
    push();
    translate(width / 2, height / 2);
    scale(editor.cameraZoom);
    translate(editor.cameraX, editor.cameraY);

    const mouseWorld = toWorld(mouseX, mouseY);
    
    for (let i = 0; i < map.objects.length; i++) {
        let obj = map.objects[i];
        const selected = editor.selecting && i == editor.selection;
        const sv = selected && editor.tool == EDIT_TOOLS.MOVE ? selectVec() : {x: 0, y: 0};
        if (obj.type == OBJ_TYPES.STATIC) {
            fill(200, selected ? 100 : 255);
            stroke(0);
            beginShape();
            obj.vertices.forEach(ver => {
                vertex(ver.x + sv.x, ver.y + sv.y);
            });
            endShape(CLOSE);
        } else if (obj.type == OBJ_TYPES.SPAWN_POINT) {
            textAlign(CENTER, CENTER);
            textSize(24);

            fill(0, 200, 0, 40);
            stroke(0, 200, 0);
            rect(obj.position.x - 10 + sv.x, obj.position.y - 10 + sv.y, 20, 20);

            fill(0, 200, 0);
            noStroke();
            text("Spawn Point", obj.position.x + sv.x, obj.position.y - 30 + sv.y);
        } else if (obj.type == OBJ_TYPES.END_POINT) {
            textAlign(CENTER, CENTER);
            textSize(24);

            fill(200, 0, 0, 40);
            stroke(200, 0, 0);
            rect(obj.position.x - 10 + sv.x, obj.position.y - 10 + sv.y, 20, 20);

            fill(200, 0, 0);
            noStroke();
            text("End Point", obj.position.x + sv.x, obj.position.y - 30 + sv.y);
        }

        let editorPos = {...getEditorPosition(obj)};
        editorPos.x += sv.x;
        editorPos.y += sv.y;
        const mouseDist = dist(editorPos.x, editorPos.y, mouseWorld.x, mouseWorld.y);
        
        fill(0, 100, 255, selected ? 100 : max(min(20 - mouseDist, 20), 0));
        stroke(0, 100, 255, selected ? 200 : max(min(100 - mouseDist, 100), 40));
        
        ellipse(editorPos.x, editorPos.y, 40, 40);
    }

    if (editor.painting) {
        fill(200, 100);
        stroke(0);
        beginShape();
        editor.paintVertices.forEach(ver => {
            vertex(ver.x, ver.y);
        });
        endShape();
    }

    pop();

    drawPanel(width - 290, 10, 280, 380, false);
    
    for (let i = 0; i < 10; i++) {
        drawPanel(10, 10 + i * 50, 40, 40, i == editor.tool ? 0.2 : 0);

        if (i == EDIT_TOOLS.SELECT) { // select
            fill(0);
            noStroke();
            triangle(17, 17 + i * 50, 30, 45 + i * 50, 45, 30 + i * 50);
        } else if (i == EDIT_TOOLS.MOVE) { // move
            fill(0);
            noStroke();
            triangle(30, 15 + i * 50, 25, 20 + i * 50, 35, 20 + i * 50);
            triangle(30, 45 + i * 50, 25, 40 + i * 50, 35, 40 + i * 50);
            triangle(15, 30 + i * 50, 20, 25 + i * 50, 20, 35 + i * 50);
            triangle(45, 30 + i * 50, 40, 25 + i * 50, 40, 35 + i * 50);

            rect(20, 28 + i * 50, 20, 4);
            rect(28, 20 + i * 50, 4, 20);
        } else if (i == EDIT_TOOLS.DELETE) {
            noStroke();
            fill(200, 10, 10);
            beginShape();
            vertex(15, 20 + i * 50);
            vertex(20, 15 + i * 50);

            vertex(30, 25 + i * 50);

            vertex(40, 15 + i * 50);
            vertex(45, 20 + i * 50);

            vertex(35, 30 + i * 50);

            vertex(45, 40 + i * 50);
            vertex(40, 45 + i * 50);

            vertex(30, 35 + i * 50);
            
            vertex(20, 45 + i * 50);
            vertex(15, 40 + i * 50);

            vertex(25, 30 + i * 50);

            endShape(CLOSE);
        } else if (i == EDIT_TOOLS.PAINT_GROUND) { // paint ground
            fill(200);
            stroke(0);
            rect(15, 25 + i * 50, 30, 20);
        }

        fill(0);
        noStroke(0);
        textSize(12);
        textAlign(RIGHT, TOP)
        text((i + 1) % 10, 46, 12 + i * 50);

        
    }
    
    fill(0);
    noStroke();
    textSize(16);
    textAlign(LEFT, TOP);
    text("nathan motorcycle LEVEL EDITOR or something idk", 80, 16);
    text("press enter to playtest. r to reset camera. zoom: " + editor.cameraZoom + "x", 80, 32);
}

function drawPanel(x, y, w, h, down) {
    noStroke();
    fill(0, 100);
    rect(x + 5, y + 5, w, h);

    stroke(0);
    fill(255 * (1 - down), 255 * (1 - down), 255);
    rect(x, y, w, h);
}

class PhysicsBody {

    constructor(world, body) {
        this.world = world;
        this.body = body;
        World.add(this.world, this.body);
    }

    draw() {
        if (this.body.parts && this.body.parts.length > 1) {
            for (let p = 1; p < this.body.parts.length; p++) {
              this.drawVertices(this.body.parts[p].vertices);
            }
        } else {
            if (this.body.type == "composite") {
              for (let body of this.body.bodies) {
                this.drawVertices(body.vertices);
              }
            } else {
              this.drawVertices(this.body.vertices);
            }
        }
    }

    drawVertices(vertices) {
        beginShape();
        vertices.forEach(ver => {
            vertex(ver.x, ver.y);
        });
        endShape(CLOSE);
    }

}