

//import 'flowbite';
//2xs 0-320 watch
//xs 320-640 phone-xs
//md 640-768 phone-modern
//lg 768-1024 tablet
//xl 1024-1280 laptop
//2xl 1280-1536 desktop
window.simuating = false;


// ---------------------------------------------------------------------------
// PHONE PEEK — the switch Neo asked for in the cols==1 branch below.
//
// His note there reads: "HERE PUT SOME LOGIC TO SIDABLE THIS, MAYBE BASED ON A
// CLASS ON <body> like: .full-screen". This is that class switch, with one
// deliberate change: the polarity is inverted, so peek is opt-IN.
// `.full-screen` would have been a disable flag, i.e. peek ON for everybody —
// and this is a published package, so that would silently rescale every design
// already built against 0.1.x/0.2.0. Off by default; nobody is surprised.
//
//   <html>                                          peek OFF  (default)
//   <html class="sqr-peek">                         peek ON   at 0.89
//   <html class="sqr-peek" data-sqr-peek="0.85">    peek ON   at 0.85
//
// The class goes on <html> (not <body>): it is always present, it survives a
// body swap, and it can be set in the server-rendered markup so the very first
// solve already has it.
//
// TO FLIP TO NEO'S ORIGINAL POLARITY (peek always on, `.full-screen` opts out)
// swap the one line marked FLIP in sqrPeekFactor().
const SQR_PEEK_CLASS   = 'sqr-peek';        // the switch
const SQR_PEEK_ATTR    = 'data-sqr-peek';   // the amount, on the same element
const SQR_PEEK_DEFAULT = 0.89;              // Neo's number: leaves ~11% showing
const SQR_PEEK_MIN     = 0.5;               // never shrink the canon past half the screen
const SQR_PEEK_MAX     = 1;                 // 1 = no peek at all

function sqrPeekElement() {
    return document.documentElement;
}

// Returns the multiplier to apply to the solved ratio: exactly 1 when the
// switch is off, otherwise the (guarded) peek factor.
function sqrPeekFactor() {
    let el = sqrPeekElement();

    // FLIP: for Neo's original polarity, replace this line with
    //       if (!el || el.classList.contains('full-screen')) return 1;
    if (!el || !el.classList.contains(SQR_PEEK_CLASS)) return 1;

    let raw = el.getAttribute(SQR_PEEK_ATTR);
    if (raw === null || raw === '') return SQR_PEEK_DEFAULT;

    let f = parseFloat(raw);
    if (!isFinite(f)) return SQR_PEEK_DEFAULT;                    // garbage -> default
    return Math.min(SQR_PEEK_MAX, Math.max(SQR_PEEK_MIN, f));     // out of range -> clamped
}


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

                // 0.2.0: the above, made switchable. sqrPeekFactor() returns
                // the 0.89 (or the data-sqr-peek override) only when <html>
                // carries `sqr-peek`, and otherwise returns exactly 1 —
                // and `x * 1` is exact in IEEE-754, so with the switch off this
                // line cannot change a single digit of the old result.
                // Scope note: this is inside if(cols==1), so peek only ever
                // touches the phone bracket (<=640, including the sub-320 watch
                // range, which also has cols==1). md/lg/xl never reach it.
                ratio = ratio*sqrPeekFactor();
            }
            // NOTE (0.2.0): an `else { ratio = ratio/cols; }` used to sit here, so on md
            // and lg the ratio was divided by `cols` twice and the effective divisor was
            // cols² — 1.44 instead of 1.2, and 2.5921 instead of 1.61. That broke the
            // invariant this whole branch exists to hold: `cols` is how many canonical
            // columns land on screen. Squared, lg put 2.59 columns on a 1023px screen
            // while the xl branch below puts 2 columns on a 1024px one, so the design got
            // BIGGER as the screen got wider. `cols` is now applied exactly once.
            // The if(cols==1) block above is kept: it is the phone peek, which is a
            // separate feature (also 0.2.0) and not part of this fix. See CHANGELOG 0.2.0.
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


// ---------------------------------------------------------------------------
// LIVE RE-SOLVE — what makes the peek an actual back-and-forth switch.
//
// window.squareRootResolve() is the public entry point: the same solve resize
// runs, plus one piece of bookkeeping. A solve is asynchronous and holds the
// re-entrancy guard for ~1s, so a call landing mid-solve would be silently
// dropped by `if(window.simuating) return null;`. Here it is retried once the
// guard releases instead, which is what lets you flip the class twice in quick
// succession and still land on the right scale.
let sqrResolveRetry = null;
function squareRootResolve() {
    clearTimeout(sqrResolveRetry);
    if (window.simuating) {
        sqrResolveRetry = setTimeout(squareRootResolve, 1100);   // guard releases at ~1000ms
        return;
    }
    simulateScreen();
}
window.squareRootResolve = squareRootResolve;

// Toggling the class should be enough on its own — nobody should have to
// remember to call a function. One observer, on one element, filtered to the
// two attributes that matter, and it compares the resulting factor before
// re-solving so that unrelated class writes on <html> (dark mode, scroll locks,
// Livewire, whatever the host app does) do not trigger a gratuitous solve.
let sqrLastPeek = sqrPeekFactor();
new MutationObserver(function() {
    let now = sqrPeekFactor();
    if (now === sqrLastPeek) return;
    sqrLastPeek = now;
    squareRootResolve();
}).observe(sqrPeekElement(), { attributes: true, attributeFilter: ['class', SQR_PEEK_ATTR] });

