const mario = document.querySelector('.mario');
const pipe = document.querySelector('.pipe');

const playButton = document.getElementById('playButton');
const gameOverButton = document.getElementById('gameOverButton');

let gameLoop;

const jump = () => {
    mario.classList.add('jump')

    setTimeout(() => {

        mario.classList.remove('jump')

    }, 500);
}  

function minhaFuncao() {
  window.location.href = 'index.html';
}

pipe.style.display = 'none';

const startGame = () => {
    
    pipe.style.display = 'block';
    playButton.style.display = 'none';
    gameOverButton.style.display = 'none';
  
    gameLoop = setInterval(() => {
    
            const pipePosition = pipe.offsetLeft;
            const marioPosition = +window.getComputedStyle(mario).bottom.replace('px', '');
        
            console.log(marioPosition); 
        
            if(pipePosition <= 120 && pipePosition > 0 && marioPosition < 80 ) {
        
                pipe.style.animation = 'none';
                pipe.style.left = `${pipePosition}px`;
        
                mario.style.animation = 'none';
                mario.style.bottom = `${pipePosition}px`;
        
                mario.src = 'img/1.png';
                mario.style.width = '190px';
                mario.style.marginLeft = '50px';

                setTimeout(minhaFuncao, 1000); 

                gameOverButton.style.display = 'block';
                clearInterval(loop);
            }
            
        
    }, 10);
  };
  

playButton.addEventListener('click', () => {
  startGame();
});

document.addEventListener('keydown', jump)

