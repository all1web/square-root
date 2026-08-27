

//import 'flowbite';
//2xs 0-320 watch
//xs 320-640 phone-xs
//md 640-768 phone-modern
//lg 768-1024 tablet
//xl 1024-1280 laptop
//2xl 1280-1536 desktop
window.simuating = false;


function simulateScreen() {



    if(window.simuating) return null;
    window.simuating = true;


    let squareRootStyleTag = document.getElementById('square-root');
    squareRootStyleTag.innerHTML = (" :root { font-size:100%; } ");

    setTimeout(function(){

        let macroRem = document.querySelector('.sqr-macro-rem');
        let  simulatedWidth = macroRem.offsetWidth;

        let  width = window.innerWidth;

        let screen='xs';
        let cols =1;
        if(width>=320 && width<=640) {
            screen='sm';
        }
        else if(width>640 && width<768) {
            screen='md';
            cols=1.2;
        }
        else if(width>=768 && width<1024) {
            screen='lg';
            cols=1.61;//seems like the orientation/landscape rule in sqr scss making this not work right
        }else if(width>=1024 ) {
            screen='xl';
        }
       /* }else if(width>=1280 && width<1536) {
            screen='2xl';
            cols=2.1;
        }else {
            cols=2.1;
        }*/
        console.log("Screen: "+screen );
//2xs 0-320 watch
//xs 320-640 phone-xs
//md 640-768 phone-modern
//lg 768-1024 tablet
//xl 1024-1280 laptop
//2xl 1280-1536 desktop

        /*let  height = window.innerHeight;
        let landscape = false;

        if( width > height ) {
            landscape=true;
        }*/

        let macroPx = document.querySelector('.sqr-macro-pixel');

        //let simulatedHeight = macroRem.offsetHeight;
        //was trying to calculated without using reading of .sqr-macro-rem that browser lags and has to calculate at the time its rendered but my brain is too tired from days of non-end work on this theme
        //let intendedWidthFeel = macroPx.offsetWidth;
        //let ratio2   = (intendedWidthFeel /width) / 0.0625;
        //let simulatingHeight = macroRem.offsetHeight;


        let idealSqrPixelWidth = 360;
        //let cols=  parseInt((width/idealSqrPixelWidth)/2)+1;

//2xs 0-320 watch
//xs 320-640 phone-xs
//md 640-768 phone-modern/tablet
//lg 768-1024 laptop
//xl 1024-1280 small monitor
//2xl 1280-1536 big monitor
//3xxl 1536-1920 wide monitor

        let ratio = width/simulatedWidth;
        if(width < 1024 ) {

            ratio = ratio/cols;

            //if horizontal scrolling page && right width
            if(cols==1) //1 && width>320 && width< 1024 ) /* HERE PUT SOME LOGIC TO SIDABLE THIS, MAYBE BASED ON A CLASS ON <body> like: .full-screen */
            {
                //This baiscally further resized the screen smaller so the tip of the right card shows so that
                // user knows they can scroll to the right/left horizontally
             //   ratio = ratio*0.89;
            }else {
                ratio = ratio/cols;
            }
        }else {
            //simply make it smallest adjustments for perfect column fit.
            simulatedWidth=parseInt(width/simulatedWidth)*simulatedWidth;
              ratio = width/simulatedWidth;
        }

        squareRootStyleTag.innerHTML = (" :root { font-size:"+ ratio*100 +"%; } ");
        setTimeout(function(){
            //    alert(simulatedWidth+' < '+width);
            macroRem = document.querySelector('.sqr-macro-rem');
            let newSimulatedWidth = macroRem.offsetWidth;
            let newSimulatedHeight = macroRem.offsetHeight;
            console.log("New Simulated Ratio: "+ratio+"% "+simulatedWidth+"<==>"+newSimulatedWidth);
            window.simuating = false;
        },500);
    },500);

}

simulateScreen();
window.onresize = simulateScreen;
window.onload = simulateScreen();


screen.orientation.addEventListener("change", function(e) {
    let squareRootStyleTag = document.getElementById('square-root');
    squareRootStyleTag.innerHTML = (" :root { font-size:100%; } ");
    simulateScreen();

});

