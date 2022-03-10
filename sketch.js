const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Body = Matter.Body,
    Composite = Matter.Composite,
    Constraint = Matter.Constraint,
    World = Matter.World,
    Detector = Matter.Detector;

let keys = {};

const engine = Engine.create();

let inGame = false;
let inEditor = true;

let GRAVITY = 0.6;
let FRONT_WHEEL_SPEED = 9;
let BACK_WHEEL_SPEED = 12;
let SPIN_SPEED = 8;
let WHEEL_FRICTION = 0.8;
let AIR_FRICTION = 0.005;
let BODY_DENSITY = 10;
let WHEEL_DENSITY = 10;
let WHEEL_STIFFNESS = 9;

let gravSlider, frontSlider, backSlider, spinSlider, frictionSlider, airFrictionSlider, bodyDensitySlider, wheelDensitySlider, stiffnessSlider;


let game = {
    bodies: [],
    damageBodies: [],

    detector: undefined,

    motoBody: undefined,
    motoBackWheel: undefined,
    motoFrontWheel: undefined,

    motoFrontConstraint: undefined,
    motoBackConstraint: undefined,

    grounds: [],

    cameraX: 0,
    cameraY: 0,

    mapState: 0,
    mapStartTime: 0,
    mapEndTime: 0,
    mapStartPoint: undefined,
    mapEndPoint: undefined,
}

const OBJ_TYPES = {
    NONE: 0,
    STATIC: 1,
    SPAWN_POINT: 2,
    END_POINT: 3,
    DAMAGE: 4,
};

const EDIT_TOOLS = {
    SELECT: 0,
    MOVE: 1,
    DELETE: 2,
    PAINT_GROUND: 3,
    PAINT_DAMAGE: 4,
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

let nathanImage;

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
            vertices: [{x: 0, y: 0}, {x: 1000, y: 0}, {x: 1000, y: 100}, {x: 0, y: 100}],
        }
    ]
};

function setup() {
    createCanvas(windowWidth, windowHeight);
    document.addEventListener('contextmenu', event => event.preventDefault());

    nathanImage = loadImage("https://i.imgur.com/qNRBIvl.png");

    gravSlider = createSlider(-1, 2, GRAVITY, 0.01);
    gravSlider.position(width - 220, 40);
    gravSlider.style('width', '200px');

    frontSlider = createSlider(0, 30, FRONT_WHEEL_SPEED, 0.01);
    frontSlider.position(width - 220, 80);
    frontSlider.style('width', '200px');

    backSlider = createSlider(0, 30, BACK_WHEEL_SPEED, 0.01);
    backSlider.position(width - 220, 120);
    backSlider.style('width', '200px');

    spinSlider = createSlider(0, 30, SPIN_SPEED, 0.01);
    spinSlider.position(width - 220, 160);
    spinSlider.style('width', '200px');

    frictionSlider = createSlider(0, 2, WHEEL_FRICTION, 0.01);
    frictionSlider.position(width - 220, 200);
    frictionSlider.style('width', '200px');

    airFrictionSlider = createSlider(0, 0.1, AIR_FRICTION, 0.001);
    airFrictionSlider.position(width - 220, 240);
    airFrictionSlider.style('width', '200px');
    
    bodyDensitySlider = createSlider(0.01, 40, BODY_DENSITY, 0.01);
    bodyDensitySlider.position(width - 220, 280);
    bodyDensitySlider.style('width', '200px');

    wheelDensitySlider = createSlider(0.01, 40, WHEEL_DENSITY, 0.01);
    wheelDensitySlider.position(width - 220, 320);
    wheelDensitySlider.style('width', '200px');

    stiffnessSlider = createSlider(0.01, 100, WHEEL_STIFFNESS, 0.01);
    stiffnessSlider.position(width - 220, 360);
    stiffnessSlider.style('width', '200px');
}

function resetWorld() {
    game.bodies = [];
    game.damageBodies = [];
    game.grounds = [];

    World.clear(engine.world);
    Engine.clear(engine);

    engine.world.gravity.y = GRAVITY;

    game.motoBody = new PhysicsBody(engine.world, Bodies.fromVertices(0, 0, [{x: 20, y: 0}, {x: 80, y: 0}, {x: 85, y: 30}, {x: 15, y: 30}], {friction: 0.0, density: BODY_DENSITY * 0.0001, frictionAir: AIR_FRICTION}));
    game.motoBackWheel = new PhysicsBody(engine.world, Bodies.circle(-35, 10, 20, {density: WHEEL_DENSITY * 0.0001, friction: WHEEL_FRICTION, frictionAir: AIR_FRICTION}));
    game.motoFrontWheel = new PhysicsBody(engine.world, Bodies.circle(35, 10, 20, {density: WHEEL_DENSITY * 0.0001, friction: WHEEL_FRICTION, frictionAir: AIR_FRICTION}));


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
    game.motoBackConstraint = Constraint.create({
        bodyA: game.motoBody.body,
        bodyB: game.motoBackWheel.body,
        pointA: {x: -35, y: 10},
        length: 0,
        stiffness: WHEEL_STIFFNESS * 0.01,
    });
    World.add(engine.world, game.motoBackConstraint);

    game.motoFrontConstraint = Constraint.create({
        bodyA: game.motoBody.body,
        bodyB: game.motoFrontWheel.body,
        pointA: {x: 35, y: 10},
        length: 0,
        stiffness: WHEEL_STIFFNESS * 0.01,
    });

    World.add(engine.world, game.motoFrontConstraint);

    game.bodies.push(game.motoBody);
    game.bodies.push(game.motoBackWheel);
    game.bodies.push(game.motoFrontWheel);

    game.mapStartPoint = {x: 0, y: 0};
    game.mapEndPoint = {x: 0, y: 0};

    map.objects.forEach(obj => {
        if (obj.type == OBJ_TYPES.STATIC) {
            game.grounds.push(createStatic(obj));
        } else if (obj.type == OBJ_TYPES.SPAWN_POINT) {
            game.mapStartPoint = {x: obj.position.x, y: obj.position.y};
        } else if (obj.type == OBJ_TYPES.END_POINT) {
            game.mapEndPoint = {x: obj.position.x, y: obj.position.y};
        } else if (obj.type == OBJ_TYPES.DAMAGE) {
            game.damageBodies.push(createStatic(obj));
        }
    });

    teleportCar(game.mapStartPoint.x, game.mapStartPoint.y - 40);

    game.cameraX = game.mapStartPoint.x;
    game.cameraY = game.mapStartPoint.y;

    game.detector = Detector.create();
    game.detector.bodies.push(game.motoBody.body);
    game.detector.bodies.push(game.motoBackWheel.body);
    game.detector.bodies.push(game.motoFrontWheel.body);
    for (let dmgBody of game.damageBodies) {
        game.detector.bodies.push(dmgBody.body);
    }
    
    game.mapState = 0;
    game.mapStartTime = millis();
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
    if (object.type == OBJ_TYPES.STATIC || object.type == OBJ_TYPES.DAMAGE) {
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
    } else if (object.type == OBJ_TYPES.SPAWN_POINT || object.type == OBJ_TYPES.END_POINT) {
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
    
    if (game.mapState == 0) {
        game.cameraX = lerp(game.cameraX, game.motoBody.body.position.x, 0.1);
        game.cameraY = lerp(game.cameraY, game.motoBody.body.position.y, 0.1);


        if (keys[UP_ARROW] >= 0 || keys[87] >= 0) {
            Body.setAngularVelocity(game.motoBackWheel.body, game.motoBackWheel.body.angularVelocity + 0.001 * BACK_WHEEL_SPEED);
            Body.setAngularVelocity(game.motoFrontWheel.body, game.motoFrontWheel.body.angularVelocity + 0.001 * FRONT_WHEEL_SPEED);
        }
        if (keys[DOWN_ARROW] >= 0 || keys[83] >= 0) {
            Body.setAngularVelocity(game.motoBackWheel.body, game.motoBackWheel.body.angularVelocity - 0.001 * BACK_WHEEL_SPEED);
            Body.setAngularVelocity(game.motoFrontWheel.body, game.motoFrontWheel.body.angularVelocity - 0.001 * FRONT_WHEEL_SPEED);
        }
        if (keys[LEFT_ARROW] >= 0 || keys[65] >= 0) {
            Body.setAngularVelocity(game.motoBody.body, game.motoBody.body.angularVelocity - 0.0001 * SPIN_SPEED);
        }
        if (keys[RIGHT_ARROW] >= 0 || keys[68] >= 0) {
            Body.setAngularVelocity(game.motoBody.body, game.motoBody.body.angularVelocity + 0.0001 * SPIN_SPEED);
        }
        game.mapEndTime = millis();
        if (dist(game.motoBody.body.position.x, game.motoBody.body.position.y, game.mapEndPoint.x, game.mapEndPoint.y) < 200) {
            game.mapState = 1;
        }
        if (Detector.collisions(game.detector).length > 0) {
            game.mapState = 2;
            Composite.remove(engine.world, game.motoBackConstraint, true);
            Composite.remove(engine.world, game.motoFrontConstraint, true);
        }
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
                                if (obj.type == OBJ_TYPES.STATIC) {
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
                            } else if (obj.type == OBJ_TYPES.SPAWN_POINT || obj.type == OBJ_TYPES.END_POINT) {
                                obj.position.x += sv.x;
                                obj.position.y += sv.y;
                            }
                        }
                        editor.selecting = false;
                    } 
                } else if (editor.tool == EDIT_TOOLS.PAINT_GROUND || editor.tool == EDIT_TOOLS.PAINT_DAMAGE) {
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
                                    type: editor.tool == EDIT_TOOLS.PAINT_DAMAGE ? OBJ_TYPES.DAMAGE : OBJ_TYPES.STATIC,
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
        if (editor.cameraZoom < 0.02) {
            editor.cameraZoom = 0.02;
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

    GRAVITY = gravSlider.value();
    FRONT_WHEEL_SPEED = frontSlider.value();
    BACK_WHEEL_SPEED = backSlider.value();
    SPIN_SPEED = spinSlider.value();
    WHEEL_FRICTION = frictionSlider.value();
    AIR_FRICTION = airFrictionSlider.value();
    BODY_DENSITY = bodyDensitySlider.value();
    WHEEL_DENSITY = wheelDensitySlider.value();
    WHEEL_STIFFNESS = stiffnessSlider.value();

    drawPanel(width - 290, 10, 280, 380, false);

    fill(0);
    noStroke();
    textAlign(LEFT, TOP);
    textSize(16);

    text("gravity", width - 280, 20);
    text("front wheel speed", width - 280, 60);
    text("back wheel speed", width - 280, 100);
    text("spin speed", width - 280, 140);
    text("wheel friction", width - 280, 180);
    text("air friction", width - 280, 220);
    text("body density", width - 280, 260);
    text("wheel density", width - 280, 300);
    text("wheel stiffness", width - 280, 340);

    

    textAlign(RIGHT, TOP);

    text(GRAVITY, width - 20, 20);
    text(FRONT_WHEEL_SPEED, width - 20, 60);
    text(BACK_WHEEL_SPEED, width - 20, 100);
    text(SPIN_SPEED, width - 20, 140);
    text(WHEEL_FRICTION, width - 20, 180);
    text(AIR_FRICTION, width - 20, 220);
    text(BODY_DENSITY, width - 20, 260);
    text(WHEEL_DENSITY, width - 20, 300);
    text(WHEEL_STIFFNESS, width - 20, 340);

    text("press r while playtesting to apply changed values", width - 20, 400);
}

function drawGame() {
    stroke(230);
    for (let i = -2; i < width / 400; i ++) {
        line(game.cameraX)
    } // 66883775
    line(230);

    push();
    translate(-game.cameraX + width / 2, -game.cameraY + height / 2);

    fill(100, 220, 100, 100);
    noStroke();
    ellipse(game.mapEndPoint.x, game.mapEndPoint.y, 400, 400);

    fill(255);
    stroke(0);

    game.motoBody.draw();
    game.motoBackWheel.draw();
    game.motoFrontWheel.draw();

    line(game.motoBackWheel.body.position.x, game.motoBackWheel.body.position.y, game.motoBackWheel.body.vertices[0].x, game.motoBackWheel.body.vertices[0].y);
    line(game.motoFrontWheel.body.position.x, game.motoFrontWheel.body.position.y, game.motoFrontWheel.body.vertices[0].x, game.motoFrontWheel.body.vertices[0].y);

    image(nathanImage, game.motoBody.body.position.x - 16, game.motoBody.body.position.y - 16, 32, 32);

    fill(200);
    game.grounds.forEach(gro => {
        gro.draw();
    });

    fill(200, 0, 0);
    game.damageBodies.forEach(dmg => {
        dmg.draw();
    });

    pop();

    fill(0);
    noStroke();
    textSize(16);
    textAlign(LEFT, TOP);
    text("nathan motorcycle or something idk", 16, 16);
    text("enter to return to editor. r to restart", 16, 32);

    textAlign(CENTER, TOP);
    textSize(24);
    let time = game.mapEndTime - game.mapStartTime;
    text(nf(floor((time / 1000 / 60) % 60), 2) + ":" + nf(floor((time / 1000) % 60), 2) + "." + nf(floor(time % 1000), 3), width / 2, 200);

    if (time < 2000) {
        textSize(32);
        textAlign(CENTER, CENTER);  
        text(map.name, width / 2, height / 2);
    }

    if (game.mapState == 1) {
        fill(0);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(64);
        text("Finish!", width / 2, height / 2);
    } else if (game.mapState == 2) {
        fill(0);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(64);
        text("Dead!", width / 2, height / 2);
    }
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
        if (obj.type == OBJ_TYPES.STATIC || obj.type == OBJ_TYPES.DAMAGE) {
            let dmg = obj.type == OBJ_TYPES.DAMAGE ? 0 : 200;
            fill(200, dmg, dmg, selected ? 100 : 255);
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
        if (editor.tool == EDIT_TOOLS.PAINT_DAMAGE) {
            fill(200, 0, 0, 100);
        } else {
            fill(200, 100);
        }
        
        stroke(0);
        beginShape();
        editor.paintVertices.forEach(ver => {
            vertex(ver.x, ver.y);
        });
        endShape();
    }

    pop();

    // drawPanel(width - 290, 10, 280, 380, false);
    
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
        } else if (i == EDIT_TOOLS.PAINT_DAMAGE) { // paint ground
            fill(200, 0, 0);
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