window.addEventListener("DOMContentLoaded", function (event) {
    window.focus(); // Capture chaves imediatamente (por padrão, o foco está no editor)

    // Dados do jogo
    let snakePositions; // Uma série de posições de cobra, começando de cabeça
    let applePosition; // A posição da maçã

    let startTimestamp; // O carimbo de data/hora inicial da animação
    let lastTimestamp; // O carimbo de data/hora anterior da animação
    let stepsTaken; // Quantos passos a cobra deu
    let score;
    let contrast;

    let inputs; // Uma lista de direções que a cobra ainda precisa seguir para

    let gameStarted = false;
    let hardMode = false;

    // Configuração
    const width = 15; // Largura da grade
    const height = 15; // Altura da grade

    const speed = 200; // Milissegundos que a cobra leva para dar um passo na grade
    let fadeSpeed = 5000; // milissegundos leva para a grade desaparecer (inicialmente)
    let fadeExponential = 1.024; // após cada pontuação, levará gradualmente mais tempo para a grade desaparecer
    const contrastIncrease = 0.5; // contraste que você ganha após cada pontuação
    const color = "black"; // Cor primária

    //Configuração: Construa a grade
    // A grade consiste em blocos (largura x altura)
    // Os blocos assumem a forma de uma grade usando grade CSS
    // A peça pode representar uma parte da cobra ou de uma maçã
    // Cada bloco possui uma div de conteúdo que ocupa uma posição absoluta
    // O conteúdo pode preencher o bloco ou deslizar para dentro ou para fora em qualquer direção para assumir a forma de uma cabeça ou cauda de cobra em transição

    const grid = document.querySelector(".grid");
    for (let i = 0; i < width * height; i++) {
        const content = document.createElement("div");
        content.setAttribute("class", "content");
        content.setAttribute("id", i); // Apenas para depuração, não usado

        const tile = document.createElement("div");
        tile.setAttribute("class", "tile");
        tile.appendChild(content);

        grid.appendChild(tile);
    }

    const tiles = document.querySelectorAll(".grid .tile .content");

    const containerElement = document.querySelector(".container");
    const noteElement = document.querySelector("footer");
    const contrastElement = document.querySelector(".contrast");
    const scoreElement = document.querySelector(".score");

    // Inicializar layout
    resetGame();

    // Redefine variáveis ​​e layouts do jogo, mas não inicia o jogo (o jogo começa ao pressionar a tecla)
    function resetGame() {
        // Redefinir posições
        snakePositions = [168, 169, 170, 171];
        applePosition = 100; // Inicialmente a maçã está sempre na mesma posição para garantir que está acessível

        // Redefinir o progresso do jogo
        startTimestamp = undefined;
        lastTimestamp = undefined;
        stepsTaken = -1; // É -1 porque então a cobra começará com um passo
        score = 0;
        contrast = 1;

        // Redefinir entradas
        inputs = [];

        // Redefinir cabeçalho
        contrastElement.innerText = `${Math.floor(contrast * 100)}%`;
        scoreElement.innerText = hardMode ? `H ${score}` : score;

        // Redefinir blocos
        for (const tile of tiles) setTile(tile);

        // Renderizar maçã
        setTile(tiles[applePosition], {
            "background-color": color,
            "border-radius": "50%"
        });

        // Renderizar cobra
        // Ignore a última parte (a cobra acabou de sair dela)
        for (const i of snakePositions.slice(1)) {
            const snakePart = tiles[i];
            snakePart.style.backgroundColor = color;

            // Configure direções de transição para cabeça e cauda
            if (i == snakePositions[snakePositions.length - 1])
                snakePart.style.left = 0;
            if (i == snakePositions[0]) snakePart.style.right = 0;
        }
    }

    // Lidar com as entradas do usuário (por exemplo, iniciar o jogo)
    window.addEventListener("keydown", function (event) {
        // Se não uma tecla de seta ou espaço ou H foi pressionado, retorne
        if (
            ![
                "ArrowLeft",
                "ArrowUp",
                "ArrowRight",
                "ArrowDown",
                " ",
                "H",
                "h",
                "E",
                "e"
            ].includes(event.key)
        )
            return;

        // Se uma tecla de seta foi pressionada, primeiro evite o padrão
        event.preventDefault();

        // Se espaço foi pressionado, reinicie o jogo
        if (event.key == " ") {
            resetGame();
            startGame();
            return;
        }

        // Definir modo difícil
        if (event.key == "H" || event.key == "h") {
            hardMode = true;
            fadeSpeed = 4000;
            fadeExponential = 1.025;
            noteElement.innerHTML = `Modo difícil. Pressione espaço para começar!`;
            noteElement.style.opacity = 1;
            resetGame();
            return;
        }

        // Definir modo Fácil
        if (event.key == "E" || event.key == "e") {
            hardMode = false;
            fadeSpeed = 5000;
            fadeExponential = 1.024;
            noteElement.innerHTML = `Modo fácil. Pressione espaço para começar!`;
            noteElement.style.opacity = 1;
            resetGame();
            return;
        }

        // Se uma tecla de seta foi pressionada adiciona a direção para os próximos movimentos
        //Não permite adicionar a mesma direção duas vezes consecutivas
        // A cobra também não consegue dar uma volta completa
        // Também inicia o jogo se ainda não tiver começado
        if (
            event.key == "ArrowLeft" &&
            inputs[inputs.length - 1] != "left" &&
            headDirection() != "right"
        ) {
            inputs.push("left");
            if (!gameStarted) startGame();
            return;
        }
        if (
            event.key == "ArrowUp" &&
            inputs[inputs.length - 1] != "up" &&
            headDirection() != "down"
        ) {
            inputs.push("up");
            if (!gameStarted) startGame();
            return;
        }
        if (
            event.key == "ArrowRight" &&
            inputs[inputs.length - 1] != "right" &&
            headDirection() != "left"
        ) {
            inputs.push("right");
            if (!gameStarted) startGame();
            return;
        }
        if (
            event.key == "ArrowDown" &&
            inputs[inputs.length - 1] != "down" &&
            headDirection() != "up"
        ) {
            inputs.push("down");
            if (!gameStarted) startGame();
            return;
        }
    });

    // Comece o jogo
    function startGame() {
        gameStarted = true;
        noteElement.style.opacity = 0;
        window.requestAnimationFrame(main);
    }

    //O ciclo principal do jogo
    // Esta função é invocada aproximadamente 60 vezes por segundo para renderizar o jogo
    // Ele monitora o tempo total decorrido e o tempo decorrido desde a última chamada
    // Com base nisso, anima a cobra fazendo a transição entre as peças ou avançando para a próxima peça
    function main(timestamp) {
        try {
            if (startTimestamp === undefined) startTimestamp = timestamp;
            const totalElapsedTime = timestamp - startTimestamp;
            const timeElapsedSinceLastCall = timestamp - lastTimestamp;

            const stepsShouldHaveTaken = Math.floor(totalElapsedTime / speed);
            const percentageOfStep = (totalElapsedTime % speed) / speed;

            // Se a cobra desse um passo de uma peça para outra
            if (stepsTaken != stepsShouldHaveTaken) {
                stepAndTransition(percentageOfStep);

                // Se é hora de dar um passo
                const headPosition = snakePositions[snakePositions.length - 1];
                if (headPosition == applePosition) {
                    // Aumentar pontuação
                    score++;
                    scoreElement.innerText = hardMode ? `H ${score}` : score;

                    // Gere outra maçã
                    addNewApple();

                    // Aumente o contraste após cada pontuação
                    // Não deixe o contraste ultrapassar 1
                    contrast = Math.min(1, contrast + contrastIncrease);

                    // Depuração
                    console.log(`Contrast increased by ${contrastIncrease * 100}%`);
                    console.log(
                        "New fade speed (from 100% to 0% in milliseconds)",
                        Math.pow(fadeExponential, score) * fadeSpeed
                    );
                }

                stepsTaken++;
            } else {
                transition(percentageOfStep);
            }

            if (lastTimestamp) {
                // Diminui o contraste com base no tempo decorrido na pontuação atual
                // Com uma pontuação mais alta o contraste diminui mais lentamente
                const contrastDecrease =
                    timeElapsedSinceLastCall /
                    (Math.pow(fadeExponential, score) * fadeSpeed);
                // Não deixe o contraste cair abaixo de zero
                contrast = Math.max(0, contrast - contrastDecrease);
            }

            contrastElement.innerText = `${Math.floor(contrast * 100)}%`;
            containerElement.style.opacity = contrast;

            window.requestAnimationFrame(main);
        } catch (error) {
            // Escreva uma nota sobre como reiniciar o jogo e definir a dificuldade
            const pressSpaceToStart = "Pressione espaço para reiniciar o jogo.";
            const changeMode = hardMode
                ? "Voltar ao modo fácil? Pressione a letra E."
                : "Pronto para mais? Pressione a letra H.";
            const followMe =
                '';
            noteElement.innerHTML = `${error.message}. ${pressSpaceToStart} <div>${changeMode}</div> ${followMe}`;
            noteElement.style.opacity = 1;
            containerElement.style.opacity = 1;
        }

        lastTimestamp = timestamp;
    }

    // Move a cobra e configura blocos para a função de transição para que a função de transição seja mais eficaz (a função de transição é chamada com mais frequência)
    function stepAndTransition(percentageOfStep) {
        // Calcule a próxima posição e adicione-a à cobra
        const newHeadPosition = getNextPosition();
        console.log(`Snake stepping into tile ${newHeadPosition}`);
        snakePositions.push(newHeadPosition);

        //Começa com cauda em vez de cabeça
        // Porque a cabeça pode entrar na posição anterior da cauda

        // Limpa o bloco, mas mantém-no no array se a cobra crescer.
        // Sempre que a cobra pisar em uma nova peça, ela sairá da última.
        // Mesmo assim, a última peça permanece no array se a cobra apenas crescer.
        // Como efeito colateral caso a cobra coma apenas uma maçã,
        // a transição da cauda acontecerá neste bloco "oculto"
        // (assim a cauda aparece estacionária).
        const previousTail = tiles[snakePositions[0]];
        setTile(previousTail);

        if (newHeadPosition != applePosition) {
            // Solte a cauda anterior
            snakePositions.shift();

            // Configurar e iniciar a transição para a nova cauda
            // Certifique-se de que ele segue na direção certa e defina o tamanho inicial
            const tail = tiles[snakePositions[0]];
            const tailDi = tailDirection();
            // O valor da cauda é inverso porque desliza para fora e não para dentro
            const tailValue = `${100 - percentageOfStep * 100}%`;

            if (tailDi == "right")
                setTile(tail, {
                    left: 0,
                    width: tailValue,
                    "background-color": color
                });

            if (tailDi == "left")
                setTile(tail, {
                    right: 0,
                    width: tailValue,
                    "background-color": color
                });

            if (tailDi == "down")
                setTile(tail, {
                    top: 0,
                    height: tailValue,
                    "background-color": color
                });

            if (tailDi == "up")
                setTile(tail, {
                    bottom: 0,
                    height: tailValue,
                    "background-color": color
                });
        }

        // Defina a cabeça anterior para o tamanho máximo
        const previousHead = tiles[snakePositions[snakePositions.length - 2]];
        setTile(previousHead, { "background-color": color });

        // Configure e comece a transição para o novo cabeçote
        // Certifique-se de que ele segue na direção certa e defina o tamanho inicial
        const head = tiles[newHeadPosition];
        const headDi = headDirection();
        const headValue = `${percentageOfStep * 100}%`;

        if (headDi == "right")
            setTile(head, {
                left: 0, // Deslize da esquerda
                width: headValue,
                "background-color": color,
                "border-radius": 0
            });

        if (headDi == "left")
            setTile(head, {
                right: 0, // Deslize da direita
                width: headValue,
                "background-color": color,
                "border-radius": 0
            });

        if (headDi == "down")
            setTile(head, {
                top: 0, // Deslize de cima para baixo
                height: headValue,
                "background-color": color,
                "border-radius": 0
            });

        if (headDi == "up")
            setTile(head, {
                bottom: 0, // Deslize de baixo para cima
                height: headValue,
                "background-color": color,
                "border-radius": 0
            });
    }

    // Transição cabeça e cauda entre duas etapas
    // Chamado com cada quadro de animação, exceto ao passar para um novo bloco
    function transition(percentageOfStep) {
        // Cabeça de transição
        const head = tiles[snakePositions[snakePositions.length - 1]];
        const headDi = headDirection();
        const headValue = `${percentageOfStep * 100}%`;
        if (headDi == "right" || headDi == "left") head.style.width = headValue;
        if (headDi == "down" || headDi == "up") head.style.height = headValue;

        // Cauda de transição
        const tail = tiles[snakePositions[0]];
        const tailDi = tailDirection();
        const tailValue = `${100 - percentageOfStep * 100}%`;
        if (tailDi == "right" || tailDi == "left") tail.style.width = tailValue;
        if (tailDi == "down" || tailDi == "up") tail.style.height = tailValue;
    }

    // Calcule em qual ladrilho a cobra entrará
    // Erro de lançamento se a cobra morder o rabo ou bater na parede
    function getNextPosition() {
        const headPosition = snakePositions[snakePositions.length - 1];
        const snakeDirection = inputs.shift() || headDirection();
        switch (snakeDirection) {
            case "right": {
                const nextPosition = headPosition + 1;
                if (nextPosition % width == 0) throw Error("A cobra bateu na parede");
                // Ignore a última parte da cobra, ela sairá conforme a cabeça se move
                if (snakePositions.slice(1).includes(nextPosition))
                    throw Error("A cobra se mordeu");
                return nextPosition;
            }
            case "left": {
                const nextPosition = headPosition - 1;
                if (nextPosition % width == width - 1 || nextPosition < 0)
                    throw Error("A cobra bateu na parede");
                // Ignore a última parte da cobra, ela sairá conforme a cabeça se move
                if (snakePositions.slice(1).includes(nextPosition))
                    throw Error("A cobra se mordeu");
                return nextPosition;
            }
            case "down": {
                const nextPosition = headPosition + width;
                if (nextPosition > width * height - 1)
                    throw Error("A cobra bateu na parede");
                // Ignore a última parte da cobra, ela sairá conforme a cabeça se move
                if (snakePositions.slice(1).includes(nextPosition))
                    throw Error("A cobra se mordeu");
                return nextPosition;
            }
            case "up": {
                const nextPosition = headPosition - width;
                if (nextPosition < 0) throw Error("A cobra bateu na parede");
                // Ignore a última parte da cobra, ela sairá conforme a cabeça se move
                if (snakePositions.slice(1).includes(nextPosition))
                    throw Error("A cobra se mordeu");
                return nextPosition;
            }
        }
    }

    // Calcule em que direção a cabeça da cobra está se movendo
    function headDirection() {
        const head = snakePositions[snakePositions.length - 1];
        const neck = snakePositions[snakePositions.length - 2];
        return getDirection(head, neck);
    }

    // Calcule em que direção fica a cauda da cobra
    function tailDirection() {
        const tail1 = snakePositions[0];
        const tail2 = snakePositions[1];
        return getDirection(tail1, tail2);
    }

    function getDirection(first, second) {
        if (first - 1 == second) return "right";
        if (first + 1 == second) return "left";
        if (first - width == second) return "down";
        if (first + width == second) return "up";
        throw Error("the two tile are not connected");
    }

    // Gera uma nova maçã no campod
    function addNewApple() {
        // Encontre uma posição para a nova maçã que ainda não foi ocupada pela cobra
        let newPosition;
        do {
            newPosition = Math.floor(Math.random() * width * height);
        } while (snakePositions.includes(newPosition));

        // Definir nova maçã
        setTile(tiles[newPosition], {
            "background-color": color,
            "border-radius": "50%"
        });

        // Observe que a maçã está aqui
        applePosition = newPosition;
    }

    // Redefine propriedades CSS relacionadas ao tamanho e posição
    function setTile(element, overrides = {}) {
        const defaults = {
            width: "100%",
            height: "100%",
            top: "auto",
            right: "auto",
            bottom: "auto",
            left: "auto",
            "background-color": "transparent"
        };
        const cssProperties = { ...defaults, ...overrides };
        element.style.cssText = Object.entries(cssProperties)
            .map(([key, value]) => `${key}: ${value};`)
            .join(" ");
    }
});
