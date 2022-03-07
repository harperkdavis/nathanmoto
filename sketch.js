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

let bodies = [];

let motoBody;
let motoBackWheel, motoFrontWheel;

let groundPlane;

let cameraX = 0, cameraY = 0;

function setup() {
    createCanvas(windowWidth, windowHeight);

    engine.world.gravity.y = 0.6;

    motoBody = new PhysicsBody(engine.world, Bodies.fromVertices(200, 0, [{x: 0, y: 0}, {x: 100, y: 0}, {x: 85, y: 30}, {x: 15, y: 30}]));
    motoBackWheel = new PhysicsBody(engine.world, Bodies.circle(100, 0, 20, {friction: 1.0}));
    motoFrontWheel = new PhysicsBody(engine.world, Bodies.circle(300, 0, 20, {friction: 1.0}));


    motoFrontWheel.body.collisionFilter = {
        'group': 1,
        'category': 0b0001,
        'mask': 0b0001,
    };
    motoBackWheel.body.collisionFilter = {
        'group': 1,
        'category': 0b0001,
        'mask': 0b0001,
    };
    motoBody.body.collisionFilter = {
        'group': 0,
        'category': 0b0010,
        'mask': 0b0001,
    };

    World.add(engine.world, Constraint.create({
        bodyA: motoBody.body,
        bodyB: motoBackWheel.body,
        pointA: {x: -35, y: 10},
        length: 0,
        stiffness: 0.04,
    }));

    World.add(engine.world, Constraint.create({
        bodyA: motoBody.body,
        bodyB: motoFrontWheel.body,
        pointA: {x: 35, y: 10},
        length: 0,
        stiffness: 0.04,
    }));

    bodies.push(motoBody);
    bodies.push(motoBackWheel);
    bodies.push(motoFrontWheel);

    groundPlane = new PhysicsBody(engine.world, Bodies.fromVertices(400, 1000, [
        {x: 0, y: 0},
        {x: 2000, y: 0},
        {x: 3000, y: 200},
        {x: 4000, y: 500},
        {x: 5000, y: 200},
        {x: 0, y: 2000},
    ], { isStatic: true }));
    
    teleportCar(0, -200);
}

function teleportCar(x, y) {
    Body.setPosition(motoBody.body, {x: x, y: y});
    Body.setPosition(motoFrontWheel.body, {x: x + 100, y: y});
    Body.setPosition(motoBackWheel.body, {x: x - 100, y: y});
}


function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function update() {
    Engine.update(engine, 1000 / 60);

    Object.keys(keys).forEach(key => {
        if (keys[key] >= 0) {
            keys[key] += 1;
        }
    });


    cameraX = lerp(cameraX, motoBody.body.position.x, 0.1);
    cameraY = lerp(cameraY, motoBody.body.position.y, 0.1);


    if (keys[UP_ARROW] >= 0) {
        Body.setAngularVelocity(motoBackWheel.body, motoBackWheel.body.angularVelocity + 0.02);
        Body.setAngularVelocity(motoFrontWheel.body, motoFrontWheel.body.angularVelocity + 0.01);
    }
    if (keys[DOWN_ARROW] >= 0) {
        Body.setAngularVelocity(motoBackWheel.body, motoBackWheel.body.angularVelocity - 0.02);
        Body.setAngularVelocity(motoFrontWheel.body, motoFrontWheel.body.angularVelocity - 0.01);
    }
    if (keys[LEFT_ARROW] >= 0) {
        Body.setAngularVelocity(motoBody.body, motoBody.body.angularVelocity - 0.001);
    }
    if (keys[RIGHT_ARROW] >= 0) {
        Body.setAngularVelocity(motoBody.body, motoBody.body.angularVelocity + 0.001);
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

    push();
    translate(-cameraX + width / 2, -cameraY + height / 2);
    fill(255);
    stroke(0);

    motoBody.draw();
    motoBackWheel.draw();
    motoFrontWheel.draw();

    line(motoBackWheel.body.position.x, motoBackWheel.body.position.y, motoBackWheel.body.vertices[0].x, motoBackWheel.body.vertices[0].y);
    line(motoFrontWheel.body.position.x, motoFrontWheel.body.position.y, motoFrontWheel.body.vertices[0].x, motoFrontWheel.body.vertices[0].y);

    fill(200);
    groundPlane.draw();

    pop();

    fill(0);
    noStroke();
    textSize(16);
    textAlign(LEFT, TOP);
    text("nathan motorcycle or something idk", 16, 16);
    text("pos: " + motoBody.body.position.x + ", " + motoBody.body.position.y, 16, 32);

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