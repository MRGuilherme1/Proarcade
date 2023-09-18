Math.minmax = (value, limit) => {
    return Math.max(Math.min(value, limit), -limit);
};

const distance2D = (p1, p2) => {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
};

// Ângulo entre os dois pontos
const getAngle = (p1, p2) => {
    let angle = Math.atan((p2.y - p1.y) / (p2.x - p1.x));
    if (p2.x - p1.x < 0) angle += Math.PI;
    return angle;
};

// O mais próximo que uma bola e uma tampa de parede podem estar
const closestItCanBe = (cap, ball) => {
    let angle = getAngle(cap, ball);

    const deltaX = Math.cos(angle) * (wallW / 2 + ballSize / 2);
    const deltaY = Math.sin(angle) * (wallW / 2 + ballSize / 2);

    return { x: cap.x + deltaX, y: cap.y + deltaY };
};

// Role a bola ao redor da tampa da parede
const rollAroundCap = (cap, ball) => {
    // A direção em que a bola não pode se mover mais porque a parede a retém
    let impactAngle = getAngle(ball, cap);

    // A direção que a bola quer se mover com base na sua velocidade
    let heading = getAngle(
        { x: 0, y: 0 },
        { x: ball.velocityX, y: ball.velocityY }
    );

    // O ângulo entre a direção do impacto e a direção desejada da bola
    // Quanto menor for esse ângulo, maior será o impacto
    // Quanto mais próximo de 90 graus, mais suave fica (em 90 não haveria colisão)
    let impactHeadingAngle = impactAngle - heading;

    // Distância de velocidade, se não fosse atingido, teria ocorrido
    const velocityMagnitude = distance2D(
        { x: 0, y: 0 },
        { x: ball.velocityX, y: ball.velocityY }
    );
    // Componente de velocidade diagonal ao impacto
    const velocityMagnitudeDiagonalToTheImpact =
        Math.sin(impactHeadingAngle) * velocityMagnitude;

    // A que distância a bola deve estar da tampa da parede
    const closestDistance = wallW / 2 + ballSize / 2;

    const rotationAngle = Math.atan(
        velocityMagnitudeDiagonalToTheImpact / closestDistance
    );

    const deltaFromCap = {
        x: Math.cos(impactAngle + Math.PI - rotationAngle) * closestDistance,
        y: Math.sin(impactAngle + Math.PI - rotationAngle) * closestDistance
    };

    const x = ball.x;
    const y = ball.y;
    const velocityX = ball.x - (cap.x + deltaFromCap.x);
    const velocityY = ball.y - (cap.y + deltaFromCap.y);
    const nextX = x + velocityX;
    const nextY = y + velocityY;

    return { x, y, velocityX, velocityY, nextX, nextY };
};

// Diminui o valor absoluto de um número, mas mantém seu sinal, não vai abaixo de abs 0
const slow = (number, difference) => {
    if (Math.abs(number) <= difference) return 0;
    if (number > difference) return number - difference;
    return number + difference;
};

const mazeElement = document.getElementById("maze");
const joystickHeadElement = document.getElementById("joystick-head");
const noteElement = document.getElementById("note"); // Elemento de nota para instruções e textos de jogo ganho e falha no jogo

let hardMode = false;
let previousTimestamp;
let gameInProgress;
let mouseStartX;
let mouseStartY;
let accelerationX;
let accelerationY;
let frictionX;
let frictionY;

const pathW = 25; // Largura do caminho
const wallW = 10; // Largura da parede
const ballSize = 10; // Largura e altura da bola
const holeSize = 18;

const debugMode = false;

let balls = [];
let ballElements = [];
let holeElements = [];

resetGame();

// Desenhe bolas pela primeira vez
balls.forEach(({ x, y }) => {
    const ball = document.createElement("div");
    ball.setAttribute("class", "ball");
    ball.style.cssText = `left: ${x}px; top: ${y}px; `;

    mazeElement.appendChild(ball);
    ballElements.push(ball);
});

// Metadados de parede
const walls = [
    // Fronteira
    { column: 0, row: 0, horizontal: true, length: 10 },
    { column: 0, row: 0, horizontal: false, length: 9 },
    { column: 0, row: 9, horizontal: true, length: 10 },
    { column: 10, row: 0, horizontal: false, length: 9 },

    // Linhas horizontais começando na 1ª coluna
    { column: 0, row: 6, horizontal: true, length: 1 },
    { column: 0, row: 8, horizontal: true, length: 1 },

    // Linhas horizontais começando na 2ª coluna
    { column: 1, row: 1, horizontal: true, length: 2 },
    { column: 1, row: 7, horizontal: true, length: 1 },

    // Linhas horizontais começando na 3ª coluna
    { column: 2, row: 2, horizontal: true, length: 2 },
    { column: 2, row: 4, horizontal: true, length: 1 },
    { column: 2, row: 5, horizontal: true, length: 1 },
    { column: 2, row: 6, horizontal: true, length: 1 },

    // Linhas horizontais começando na 4ª coluna
    { column: 3, row: 3, horizontal: true, length: 1 },
    { column: 3, row: 8, horizontal: true, length: 3 },

    // Linhas horizontais começando na 5ª coluna
    { column: 4, row: 6, horizontal: true, length: 1 },

    // Linhas horizontais começando na 6ª coluna
    { column: 5, row: 2, horizontal: true, length: 2 },
    { column: 5, row: 7, horizontal: true, length: 1 },

    // Linhas horizontais começando na 7ª coluna
    { column: 6, row: 1, horizontal: true, length: 1 },
    { column: 6, row: 6, horizontal: true, length: 2 },

    // Linhas horizontais começando na 8ª coluna
    { column: 7, row: 3, horizontal: true, length: 2 },
    { column: 7, row: 7, horizontal: true, length: 2 },

    // Linhas horizontais começando na 9ª coluna
    { column: 8, row: 1, horizontal: true, length: 1 },
    { column: 8, row: 2, horizontal: true, length: 1 },
    { column: 8, row: 3, horizontal: true, length: 1 },
    { column: 8, row: 4, horizontal: true, length: 2 },
    { column: 8, row: 8, horizontal: true, length: 2 },

    // Linhas verticais após a 1ª coluna
    { column: 1, row: 1, horizontal: false, length: 2 },
    { column: 1, row: 4, horizontal: false, length: 2 },

    // Linhas verticais após a 2ª coluna
    { column: 2, row: 2, horizontal: false, length: 2 },
    { column: 2, row: 5, horizontal: false, length: 1 },
    { column: 2, row: 7, horizontal: false, length: 2 },

    // Linhas verticais após a 3ª coluna
    { column: 3, row: 0, horizontal: false, length: 1 },
    { column: 3, row: 4, horizontal: false, length: 1 },
    { column: 3, row: 6, horizontal: false, length: 2 },

    // Linhas verticais após a 4ª coluna
    { column: 4, row: 1, horizontal: false, length: 2 },
    { column: 4, row: 6, horizontal: false, length: 1 },

    // Linhas verticais após a 5ª coluna
    { column: 5, row: 0, horizontal: false, length: 2 },
    { column: 5, row: 6, horizontal: false, length: 1 },
    { column: 5, row: 8, horizontal: false, length: 1 },

    // Linhas verticais após a 6ª coluna
    { column: 6, row: 4, horizontal: false, length: 1 },
    { column: 6, row: 6, horizontal: false, length: 1 },

    // Linhas verticais após a 7ª coluna
    { column: 7, row: 1, horizontal: false, length: 4 },
    { column: 7, row: 7, horizontal: false, length: 2 },

    // Linhas verticais após a 8ª coluna
    { column: 8, row: 2, horizontal: false, length: 1 },
    { column: 8, row: 4, horizontal: false, length: 2 },

    // Linhas verticais após a 9ª coluna
    { column: 9, row: 1, horizontal: false, length: 1 },
    { column: 9, row: 5, horizontal: false, length: 2 }
].map((wall) => ({
    x: wall.column * (pathW + wallW),
    y: wall.row * (pathW + wallW),
    horizontal: wall.horizontal,
    length: wall.length * (pathW + wallW)
}));

// Desenhar paredes
walls.forEach(({ x, y, horizontal, length }) => {
    const wall = document.createElement("div");
    wall.setAttribute("class", "wall");
    wall.style.cssText = `
        left: ${x}px;
        top: ${y}px;
        width: ${wallW}px;
        height: ${length}px;
        transform: rotate(${horizontal ? -90 : 0}deg);`;

    mazeElement.appendChild(wall);
});

const holes = [
    { column: 0, row: 5 },
    { column: 2, row: 0 },
    { column: 2, row: 4 },
    { column: 4, row: 6 },
    { column: 6, row: 2 },
    { column: 6, row: 8 },
    { column: 8, row: 1 },
    { column: 8, row: 2 }
].map((hole) => ({
    x: hole.column * (wallW + pathW) + (wallW / 2 + pathW / 2),
    y: hole.row * (wallW + pathW) + (wallW / 2 + pathW / 2)
}));

joystickHeadElement.addEventListener("mousedown", function (event) {
    if (!gameInProgress) {
        mouseStartX = event.clientX;
        mouseStartY = event.clientY;
        gameInProgress = true;
        window.requestAnimationFrame(main);
        noteElement.style.opacity = 0;
        joystickHeadElement.style.cssText = `
        animation: none;
        cursor: grabbing;
        `;
    }
});

window.addEventListener("mousemove", function (event) {
    if (gameInProgress) {
        const mouseDeltaX = -Math.minmax(mouseStartX - event.clientX, 15);
        const mouseDeltaY = -Math.minmax(mouseStartY - event.clientY, 15);

        joystickHeadElement.style.cssText = `
        left: ${mouseDeltaX}px;
        top: ${mouseDeltaY}px;
        animation: none;
        cursor: grabbing;
        `;

        const rotationY = mouseDeltaX * 0.8; // Rotação máxima = 12
        const rotationX = mouseDeltaY * 0.8;

        mazeElement.style.cssText = `
        transform: rotateY(${rotationY}deg) rotateX(${-rotationX}deg)
        `;

        const gravity = 2;
        const friction = 0.01; // Coeficientes de atrito

        accelerationX = gravity * Math.sin((rotationY / 180) * Math.PI);
        accelerationY = gravity * Math.sin((rotationX / 180) * Math.PI);
        frictionX = gravity * Math.cos((rotationY / 180) * Math.PI) * friction;
        frictionY = gravity * Math.cos((rotationX / 180) * Math.PI) * friction;
    }
});

window.addEventListener("keydown", function (event) {
    // Se não uma tecla de seta ou espaço ou H foi pressionado, retorne
    if (![" ", "H", "h", "E", "e"].includes(event.key)) return;

    // Se uma tecla de seta foi pressionada, primeiro evite o padrão
    event.preventDefault();

    // Se espaço foi pressionado, reinicie o jogo
    if (event.key == " ") {
        resetGame();
        return;
    }

    // Definir modo difícil
    if (event.key == "H" || event.key == "h") {
        hardMode = true;
        resetGame();
        return;
    }

    // Definir modo facil
    if (event.key == "E" || event.key == "e") {
        hardMode = false;
        resetGame();
        return;
    }
});

function resetGame() {
    previousTimestamp = undefined;
    gameInProgress = false;
    mouseStartX = undefined;
    mouseStartY = undefined;
    accelerationX = undefined;
    accelerationY = undefined;
    frictionX = undefined;
    frictionY = undefined;

    mazeElement.style.cssText = `
        transform: rotateY(0deg) rotateX(0deg)
    `;

    joystickHeadElement.style.cssText = `
        left: 0;
        top: 0;
        animation: glow;
        cursor: grab;
    `;

    if (hardMode) {
        noteElement.innerHTML = `Clique no joystick para começar!
        <p>Modo difícil, evite buracos negros. Voltar ao modo fácil? Pressione E</p>`;
    } else {
        noteElement.innerHTML = `Clique no joystick para começar!
        <p>Mova cada bola para o centro. Pronto para o modo difícil? Pressione H</p>`;
    }
    noteElement.style.opacity = 1;

    balls = [
        { column: 0, row: 0 },
        { column: 9, row: 0 },
        { column: 0, row: 8 },
        { column: 9, row: 8 }
    ].map((ball) => ({
        x: ball.column * (wallW + pathW) + (wallW / 2 + pathW / 2),
        y: ball.row * (wallW + pathW) + (wallW / 2 + pathW / 2),
        velocityX: 0,
        velocityY: 0
    }));

    if (ballElements.length) {
        balls.forEach(({ x, y }, index) => {
            ballElements[index].style.cssText = `left: ${x}px; top: ${y}px; `;
        });
    }

    // Remover elementos de furo anteriores
    holeElements.forEach((holeElement) => {
        mazeElement.removeChild(holeElement);
    });
    holeElements = [];

    // Redefinir elementos de furo no modo difícil
    if (hardMode) {
        holes.forEach(({ x, y }) => {
            const ball = document.createElement("div");
            ball.setAttribute("class", "black-hole");
            ball.style.cssText = `left: ${x}px; top: ${y}px; `;

            mazeElement.appendChild(ball);
            holeElements.push(ball);
        });
    }
}

function main(timestamp) {
    // É possível reiniciar o jogo no meio do jogo. Neste caso o visual deve parar
    if (!gameInProgress) return;

    if (previousTimestamp === undefined) {
        previousTimestamp = timestamp;
        window.requestAnimationFrame(main);
        return;
    }

    const maxVelocity = 1.5;

    // Tempo decorrido desde o último ciclo dividido por 16
    // Esta função é chamada a cada 16 ms em média, então dividir por 16 resultará em 1
    const timeElapsed = (timestamp - previousTimestamp) / 16;

    try {
        // Se o mouse ainda não se moveu, não faça nada
        if (accelerationX != undefined && accelerationY != undefined) {
            const velocityChangeX = accelerationX * timeElapsed;
            const velocityChangeY = accelerationY * timeElapsed;
            const frictionDeltaX = frictionX * timeElapsed;
            const frictionDeltaY = frictionY * timeElapsed;

            balls.forEach((ball) => {
                if (velocityChangeX == 0) {
                    // Sem rotação, o avião é plano
                    // Em superfícies planas, o atrito só pode desacelerar, mas não reverter o movimento
                    ball.velocityX = slow(ball.velocityX, frictionDeltaX);
                } else {
                    ball.velocityX = ball.velocityX + velocityChangeX;
                    ball.velocityX = Math.max(Math.min(ball.velocityX, 1.5), -1.5);
                    ball.velocityX =
                        ball.velocityX - Math.sign(velocityChangeX) * frictionDeltaX;
                    ball.velocityX = Math.minmax(ball.velocityX, maxVelocity);
                }

                if (velocityChangeY == 0) {
                    // Sem rotação, o avião é plano
                    // Em superfícies planas, o atrito só pode desacelerar, mas não reverter o movimento
                    ball.velocityY = slow(ball.velocityY, frictionDeltaY);
                } else {
                    ball.velocityY = ball.velocityY + velocityChangeY;
                    ball.velocityY =
                        ball.velocityY - Math.sign(velocityChangeY) * frictionDeltaY;
                    ball.velocityY = Math.minmax(ball.velocityY, maxVelocity);
                }

                // Posição preliminar da próxima bola, só se torna verdadeira se nenhuma rebatida ocorrer
                // Usado apenas para teste de golpe, não significa que a bola chegará nesta posição
                ball.nextX = ball.x + ball.velocityX;
                ball.nextY = ball.y + ball.velocityY;

                if (debugMode) console.log("marcação", ball);

                walls.forEach((wall, wi) => {
                    if (wall.horizontal) {
                        // Parede horizontal

                        if (
                            ball.nextY + ballSize / 2 >= wall.y - wallW / 2 &&
                            ball.nextY - ballSize / 2 <= wall.y + wallW / 2
                        ) {
                            // A bola entrou na faixa da parede
                            // (não necessariamente acertar, pode ser antes ou depois)

                            const wallStart = {
                                x: wall.x,
                                y: wall.y
                            };
                            const wallEnd = {
                                x: wall.x + wall.length,
                                y: wall.y
                            };

                            if (
                                ball.nextX + ballSize / 2 >= wallStart.x - wallW / 2 &&
                                ball.nextX < wallStart.x
                            ) {
                                // A bola pode atingir a tampa esquerda de uma parede horizontal
                                const distance = distance2D(wallStart, {
                                    x: ball.nextX,
                                    y: ball.nextY
                                });
                                if (distance < ballSize / 2 + wallW / 2) {
                                    if (debugMode && wi > 4)
                                        console.warn("muito perto da cabeça", distance, ball);

                                    // A bola atinge a tampa esquerda de uma parede horizontal
                                    const closest = closestItCanBe(wallStart, {
                                        x: ball.nextX,
                                        y: ball.nextY
                                    });
                                    const rolled = rollAroundCap(wallStart, {
                                        x: closest.x,
                                        y: closest.y,
                                        velocityX: ball.velocityX,
                                        velocityY: ball.velocityY
                                    });

                                    Object.assign(ball, rolled);
                                }
                            }

                            if (
                                ball.nextX - ballSize / 2 <= wallEnd.x + wallW / 2 &&
                                ball.nextX > wallEnd.x
                            ) {
                                // A bola pode atingir a tampa direita de uma parede horizontal
                                const distance = distance2D(wallEnd, {
                                    x: ball.nextX,
                                    y: ball.nextY
                                });
                                if (distance < ballSize / 2 + wallW / 2) {
                                    if (debugMode && wi > 4)
                                        console.warn("muito perto da cauda", distance, ball);

                                    // A bola atinge a tampa direita de uma parede horizontal
                                    const closest = closestItCanBe(wallEnd, {
                                        x: ball.nextX,
                                        y: ball.nextY
                                    });
                                    const rolled = rollAroundCap(wallEnd, {
                                        x: closest.x,
                                        y: closest.y,
                                        velocityX: ball.velocityX,
                                        velocityY: ball.velocityY
                                    });

                                    Object.assign(ball, rolled);
                                }
                            }

                            if (ball.nextX >= wallStart.x && ball.nextX <= wallEnd.x) {
                                // A bola entrou no corpo principal da parede
                                if (ball.nextY < wall.y) {
                                    // Bata na parede horizontal de cima
                                    ball.nextY = wall.y - wallW / 2 - ballSize / 2;
                                } else {
                                    // Bata na parede horizontal por baixo
                                    ball.nextY = wall.y + wallW / 2 + ballSize / 2;
                                }
                                ball.y = ball.nextY;
                                ball.velocityY = -ball.velocityY / 3;

                                if (debugMode && wi > 4)
                                    console.error("cruzando a linha h, HIT", ball);
                            }
                        }
                    } else {
                        // Parede vertical

                        if (
                            ball.nextX + ballSize / 2 >= wall.x - wallW / 2 &&
                            ball.nextX - ballSize / 2 <= wall.x + wallW / 2
                        ) {
                            // A bola entrou na faixa da parede
                            // (não necessariamente acertar, pode ser antes ou depois)
                            const wallStart = {
                                x: wall.x,
                                y: wall.y
                            };
                            const wallEnd = {
                                x: wall.x,
                                y: wall.y + wall.length
                            };

                            if (
                                ball.nextY + ballSize / 2 >= wallStart.y - wallW / 2 &&
                                ball.nextY < wallStart.y
                            ) {
                                // A bola pode atingir a tampa superior de uma parede horizontal
                                const distance = distance2D(wallStart, {
                                    x: ball.nextX,
                                    y: ball.nextY
                                });
                                if (distance < ballSize / 2 + wallW / 2) {
                                    if (debugMode && wi > 4)
                                        console.warn("muito perto da cabeça", distance, ball);

                                    // A bola atinge a tampa esquerda de uma parede horizontal
                                    const closest = closestItCanBe(wallStart, {
                                        x: ball.nextX,
                                        y: ball.nextY
                                    });
                                    const rolled = rollAroundCap(wallStart, {
                                        x: closest.x,
                                        y: closest.y,
                                        velocityX: ball.velocityX,
                                        velocityY: ball.velocityY
                                    });

                                    Object.assign(ball, rolled);
                                }
                            }

                            if (
                                ball.nextY - ballSize / 2 <= wallEnd.y + wallW / 2 &&
                                ball.nextY > wallEnd.y
                            ) {
                                // A bola pode atingir a tampa inferior de uma parede horizontal
                                const distance = distance2D(wallEnd, {
                                    x: ball.nextX,
                                    y: ball.nextY
                                });
                                if (distance < ballSize / 2 + wallW / 2) {
                                    if (debugMode && wi > 4)
                                        console.warn("muito perto v cauda", distance, ball);

                                    // A bola atinge a tampa direita de uma parede horizontal
                                    const closest = closestItCanBe(wallEnd, {
                                        x: ball.nextX,
                                        y: ball.nextY
                                    });
                                    const rolled = rollAroundCap(wallEnd, {
                                        x: closest.x,
                                        y: closest.y,
                                        velocityX: ball.velocityX,
                                        velocityY: ball.velocityY
                                    });

                                    Object.assign(ball, rolled);
                                }
                            }

                            if (ball.nextY >= wallStart.y && ball.nextY <= wallEnd.y) {
                                // A bola entrou no corpo principal da parede
                                if (ball.nextX < wall.x) {
                                    // Bata na parede vertical da esquerda
                                    ball.nextX = wall.x - wallW / 2 - ballSize / 2;
                                } else {
                                    // Bata na parede vertical pela direita
                                    ball.nextX = wall.x + wallW / 2 + ballSize / 2;
                                }
                                ball.x = ball.nextX;
                                ball.velocityX = -ball.velocityX / 3;

                                if (debugMode && wi > 4)
                                    console.error("Detectar é que uma bola caiu em um buraco", ball);
                            }
                        }
                    }
                });

                // Detectar é que uma bola caiu em um buraco
                if (hardMode) {
                    holes.forEach((hole, hi) => {
                        const distance = distance2D(hole, {
                            x: ball.nextX,
                            y: ball.nextY
                        });

                        if (distance <= holeSize / 2) {
                            // A bola caiu em um buraco
                            holeElements[hi].style.backgroundColor = "red";
                            throw Error("A bola caiu em um buraco");
                        }
                    });
                }

                // Ajustar metadados da bola
                ball.x = ball.x + ball.velocityX;
                ball.y = ball.y + ball.velocityY;
            });

            // Mova as bolas para sua nova posição na IU
            balls.forEach(({ x, y }, index) => {
                ballElements[index].style.cssText = `left: ${x}px; top: ${y}px; `;
            });
        }

        // Detecção de vitória
        if (
            balls.every(
                (ball) => distance2D(ball, { x: 350 / 2, y: 315 / 2 }) < 65 / 2
            )
        ) {
            noteElement.innerHTML = `Parabéns, você conseguiu!
        ${!hardMode ? "<p>Pressione H para o modo difícil</p>" : ""}
        <p>
            
            <a href="#" , target="_blank"
            ></a
            >
        </p>`;
            noteElement.style.opacity = 1;
            gameInProgress = false;
        } else {
            previousTimestamp = timestamp;
            window.requestAnimationFrame(main);
        }
    } catch (error) {
        if (error.message == "A bola caiu em um buraco") {
            noteElement.innerHTML = `Uma bola caiu em um buraco negro! Pressione espaço para reiniciar o jogo.
        <p>
        De volta ao fácil? Pressione E
        </p>`;
            noteElement.style.opacity = 1;
            gameInProgress = false;
        } else throw error;
    }
}
