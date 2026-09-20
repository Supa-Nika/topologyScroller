import p5 from "p5";
import vertShader from "./shaders/shader.vert?raw";
import fragShader from "./shaders/shader.frag?raw";

const sketch = (p) => {
  let shaderProgram;

  // Interactive controls
  let params = {
    zoom: 1.0,
    interval: 0.045,
    speed: 0.03,
    palette: 2,
    hillshade: true
  };

  p.setup = () => {
    p.createCanvas(window.innerWidth, window.innerHeight, p.WEBGL);
    p.noStroke();
    shaderProgram = p.createShader(vertShader, fragShader);
  };

  p.draw = () => {
    p.shader(shaderProgram);

    let mouseDistance = p.dist(p.mouseX, p.mouseY, p.width / 2, p.height / 2);

    let maxmouseDistance = p.dist(0, 0, p.width / 2, p.height / 2);

    let dynamicZoom = p.map(mouseDistance, 0, maxmouseDistance, 0.5, 5.0, true);

    // Send uniform to shader
    shaderProgram.setUniform("u_zoom", dynamicZoom);

    // Pass all uniforms to GLSL
    shaderProgram.setUniform("u_resolution", [p.width, p.height]);
    shaderProgram.setUniform("u_time", p.millis() / 1000.0);
    shaderProgram.setUniform("u_zoom", dynamicZoom);
    shaderProgram.setUniform("u_interval", params.interval);
    shaderProgram.setUniform("u_speed", params.speed);
    shaderProgram.setUniform("u_palette", params.palette);
    shaderProgram.setUniform("u_hillshade", params.hillshade);

    p.rect(0, 0, p.width, p.height);
  };

  p.keyPressed = () => {
    if (p.key === '1') params.palette = 0;
    if (p.key === '2') params.palette = 1;
    if (p.key === '3') params.palette = 2;
    if (p.key === '4') params.palette = 3;
    if (p.key === 'h') params.hillshade = !params.hillshade;
  };
};

new p5(sketch);