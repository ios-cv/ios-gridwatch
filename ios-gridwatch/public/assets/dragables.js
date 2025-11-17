let mouseDown = false;
const mousePos = {};
const grabPoint = {};
let screenWidth;
let selected;
let left;
placeDragableEventListeners();

function placeDragableEventListeners(){
    const moveables = document.querySelectorAll(".title-bar");
    moveables.forEach(moveable=>{
        moveable.addEventListener("pointerdown", startDrag);
        //moveable.addEventListener("dragstart", startDrag);
    });

    document.addEventListener("pointermove", handleDrag);
    document.addEventListener("pointerup", endDrag);
    //document.addEventListener("touchmove", handleDrag);
    //document.addEventListener("touchend", endDrag);
}
function ancestorWithRelativePositioning(elem){
    if(elem.parentNode.tagName==='BODY' || getComputedStyle(elem.parentNode).position==='fixed'){
        return elem.parentNode;
    }
    else{
        return ancestorWithRelativePositioning(elem.parentNode);
    }
}
function startDrag(e){
    mousePos.x = e.pageX;
    mousePos.y = e.pageY;
    mouseDown = true;
    screenWidth=window.innerWidth;
    grabPoint.x=mousePos.x-(window.scrollX+e.currentTarget.getBoundingClientRect().x);
    grabPoint.y=mousePos.y-(window.scrollY+e.currentTarget.getBoundingClientRect().y);
    left = window.getComputedStyle(e.currentTarget).left;
    left=left.slice(0,-2);
    
    const positionedRelativeTo = ancestorWithRelativePositioning(e.currentTarget);
    let relativePosition=0;
    if(positionedRelativeTo.tagName!='BODY'){
        let relativeY=positionedRelativeTo.getBoundingClientRect().y;
        let paddingTop=getComputedStyle(positionedRelativeTo).paddingTop;
        relativePosition=window.scrollY+relativeY+paddingTop;
    }
    selected=e.currentTarget.parentNode;
    selected.style.setProperty('position','absolute');
    selected.style.setProperty('top',`${mousePos.y-grabPoint.y-relativePosition}px`);
    selected.style.setProperty('left',`${mousePos.x-grabPoint.x}px`);
    selected.style.setProperty('z-index','8');
    selected.rotate=false;
}

function handleDrag(e){
    if (!mouseDown) {
        return;
    }
    const dX = e.pageX - mousePos.x;
    const dY = e.pageY - mousePos.y;
    mousePos.x = e.pageX;
    mousePos.y = e.pageY;
    let { top, left } = window.getComputedStyle(selected);
    top = top.slice(0, -2);
    top = parseInt(top) + dY;
    left = left.slice(0, -2);
    left = parseInt(left) + dX;
    selected.style.top = `${top}px`;
    selected.style.left = `${left}px`;
}

function endDrag(){
    mouseDown = false;
    if(selected){
        let { top, left, width } = window.getComputedStyle(selected);
        width = width.slice(0, -2);
        width = parseFloat(width)
        top = top.slice(0, -2);
        top = parseInt(top);
        top = Math.max(32, top);
        left = left.slice(0, -2);
        left = parseInt(left);
        left= Math.max(0, left);
        left= Math.min(left, screenWidth-width);
        selected.style.top = `${top}px`;
        selected.style.left = `${left}px`;
    }
}
