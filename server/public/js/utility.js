document.addEventListener('DOMContentLoaded', () => {
    displayReturnToTop();
})
function hiddenTimer(element, time = 5000) {
    setTimeout(() => {
        element.hidden = true;
    }, time);
}
function classTimer(element, from, to, fin, time = null) {
    element.classList.remove(from);
    element.classList.add(to);

    if (time) {
        setTimeout(() => {
            element.classList.remove(to);
            element.classList.add(fin);
        }, time)
    }
}
function showSpinner(element, lg = '', insertFirst = false) {
    let i = document.createElement('i');
    i.setAttribute('class', `fa fa-spinner fa-spin spinner${lg}`);
    if (insertFirst && element.firstChild) {
        element.insertBefore(i, element.firstChild);
    }
    else {
        element.appendChild(i);
    }
}
function removeSpinner(element, lg = '') {
    try {
        let spinners = element.getElementsByClassName(`fa fa-spinner fa-spin spinner${lg}`);

        for (let i = 0; i < spinners.length; i++) {
            element.removeChild(spinners[i]);
        }
    }
    catch (err) {
        console.log("No spinner to remove");
        console.log(err);
    }
}

/* name: showPopover
   preconditions: el is a jquery object containing the element on which to show popover
   postconditions: popover with borderColor shown for time milliseconds
*/
function showPopover(el, time = 5000, borderColor = 'rgba(0, 0, 0, 0.2') {
    $('.popover').css('border-color', borderColor);
    el.popover('show');
    setTimeout((popel) => {
        popel.popover('dispose');
    }, time, el);
}

function setErrorBorder(el, time = 5000) {
    el.classList.add('errorBorder');
    setTimeout(el => {
        el.classList.remove('errorBorder');
    }, time, el)
}

/* name: scrollSave
   preconditions: arr is an array of elements for which we want to save the scroll x/y values
   postconditions: return an array of objects that contains references to each element along
                   with the saved scroll x/y values.
*/
function scrollSave(arr) {
    var context = []
    arr.forEach(el => {
        context.push({
            element: el,
            scrollY: el.scrollTop,
            scrollX: el.scrollLeft
        });
    });
    return context;
}

/* name: scrollRestore
   preconditions: arr is array of objects. Each object should be of format:
                    {element: element, scrollY: scrollY, scrollX: scrollX}. Best when
		    used in combination wiht scrollSave
   postconditions: scroll x/y values updated for all elements in arr
*/
function scrollRestore(arr) {
    document.getElementsByTagName('html')[0].style.scrollBehavior = "auto";
    arr.forEach(el => {
        el.element.scrollTo(el.scrollX, el.scrollY);
    })
    document.getElementsByTagName('html')[0].style.scrollBehavior = "smooth";
}
function addClasses(elements, classes) {
    for (let i = 0; i < elements.length; i++) {
        classes.forEach(cl => {
            elements[i].classList.add(cl);
        })
    }
}
function removeClasses(elements, classes) {
    for (let i = 0; i < elements.length; i++) {
        classes.forEach(cl => {
            elements[i].classList.remove(cl);
        })
    }
}

function hideElements(elements) {
    for (let i = 0; i < elements.length; i++) {
        elements[i].style.display = 'none';
    }
}
function clearInnerText(elements) {
    for (let i = 0; i < elements.length; i++) {
        elements[i].innerText = '';
    }
}
function clearCanvas(canvas) {
    var context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    canvas.classList.remove('light-border');
    canvas.height = '1rem';
}
function displayReturnToTop() {
    let html = document.getElementsByTagName('html')[0];
    let body = document.getElementsByTagName('body')[0];

    if (html.clientHeight + 100 < body.clientHeight) {
        let rtt = document.getElementsByClassName('usa-footer__return-to-top')[0];
        rtt.style.display = 'block';
    }
}
function disableElements(elements) {
    for (let i = 0; i < elements.length; i++) {
        elements[i].disabled = true;
    }
}
function enableElements(elements) {
    for (let i = 0; i < elements.length; i++) {
        elements[i].disabled = false;
    }
}
function disableForm(form) {
    var elements = form.elements;
    for (var i = 0; i < elements.length; i++) {
        elements[i].disabled = true;
    }
}
function enableForm(form) {
    var elements = form.elements;
    for (var i = 0; i < elements.length; i++) {
        elements[i].disabled = false;
    }
}

function clientDownloadFile(res) {
    var a = document.createElement('a');

    //    var data = new File(new Uint8Array(res.file.data), res.filename);
    var uint8arr = new Uint8Array(res.file.data);
    var data = new Blob([uint8arr]);
    //    var data = new Blob(uint8arr);

    var url = window.URL.createObjectURL(data);
    a.href = url;
    a.download = res.filename;
    document.body.appendChild(a);

    a.click();
    setTimeout(function () {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0)
}
/********************* table sorting methods *************************/
function clearTableGroups(table){
    let tbody = table.getElementsByTagName('tbody');
    while(tbody.length > 0){
	tbody[0].remove();
    }
}

function clearTableRows(table){
    let tbody = table.getElementsByTagName('tbody')[0];
    while(tbody.childNodes.length > 0){
	tbody.childNodes[0].remove();
    }
}

function displayTableGroups(table, list){
    list.forEach(l => {
	table.appendChild(l.element);
	if(l.nextElement){
	    table.appendChild(l.nextElement);
	}
    })
}
function displayTableRows(table, list){
    let tbody = table.getElementsByTagName('tbody')[0];
    list.forEach(l => {
	tbody.appendChild(l.element);
	if(l.nextElement){
	    tbody.appendChild(l.nextElement);
	}
    })
}

function removeSortClasses(elements){
    for(let i = 0; i < elements.length; i++){
	elements[i].classList.remove('sort', 'sortedUp', 'sortedDown');
	elements[i].classList.add('sort');
    }
}

function insertionSort(list, asc=true){
    
    let element;
    let key;
    let j;
    let temp;
    
    for(let i = 1; i < list.length; i++){
	key = list[i].value;
	j = i;

	if(asc){
	    while(j > 0 && key < list[j - 1].value){
		j--;
	    }
	}
	else{
	    while(j > 0 && key > list[j - 1].value){
		j--;
	    }
	}
	element = list[i];
	list.splice(i, 1);
	list.splice(j, 0, element);
	
    }
}
