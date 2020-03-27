/* file contains elements related to preview/submit templates for subscriptions */
document.addEventListener('DOMContentLoaded', () => {
    /* register event handlers to ensure user does only one of the following:
       a. upload a new template to use when creating new subscription
       b. select a previous template to use with new subscription
    */
    $('#templateSelect').change(() => {
	document.getElementById('uploadTemplate').value = '';
    });
    $('#uploadTemplate').on('input', () => {
	let select = document.getElementById('templateSelect');
	select.selectedIndex = 0;
    });
/*    $('#previewNewSubscription').on('click', e => {
	e.preventDefault();
	preview_new_subscription();
    });
*/
    $('#submitNewSubscription').on('click', async e => {
	e.preventDefault();
	$('#submitNewSubscription')[0].disabled = true;
	show_spinner($('#addNewSubscriptionButtons')[0]);

	var scroll = scroll_save([
	    document.getElementsByTagName('body')[0],
	    document.getElementById('subscriptionsContainer')
	]);
	
	if(validate_subscription(true))
	    await submit_new_subscription();
	
	$('#submitNewSubscription')[0].disabled = false;
	remove_spinner($('#addNewSubscriptionButtons')[0]);
	scroll_restore(scroll);
    });
    
});

async function submit_new_subscription(){
    let upload_temp = $('#uploadTemplate');
    let prev_temp = $('#templateSelect');
    let post = $('#postSelect')[0];
    let post_id = post[post.selectedIndex].getAttribute('data-COLARatesId');

    try{
	if(upload_temp[0].value){
	    var result = await add_new_subscription_with_template_file(post_id, upload_temp);
	}
	else if(prev_temp[0].selectedIndex != 0){
	    var result = await add_new_subscription_prev_template(post_id, prev_temp[0]);
	}

	if(result.success){ //reset post dropdown/files selection
	    post.selectedIndex = 0;
	    prev_temp[0].selectedIndex = 0;
	    upload_temp[0].value = "";
	    new_subscription_success(post_id);
	}
	else if(result.error)
	    throw new Error(result.error); //custom error originating from server
	else
	    throw result; //something else went wrong
    }
    catch(err){
	let pop = $('#submitNewSubscription');
	if(!result.success){
	    console.log(err);
	    pop[0].setAttribute('data-content', result.errorMessage);
	}
	else
	    pop[0].setAttribute('data-content', 'Something went wrong.');

	show_popover(pop, 4000, 'red');
    }

    //keep this in a separate try/catch statement. Will ensure if there is
    //an error at some point in the above try catch, the subscription list
    //will remain accurate, even if we deleted the subscription on server
    //and at some later point something unexpectedly threw an error.
    try{
	show_spinner($('#subscriptionsContainerSpinner')[0]);
	clear_user_subscriptions();
	await fetch_user_subscription_list();
    }
    catch(err){
	console.log(err);
    }
    remove_spinner($('#subscriptionsContainerSpinner')[0]);
}

async function add_new_subscription_prev_template(post_id, prev_temp){     
    try {
	let context ={};
	context.post_id = post_id;
	context.template_id = prev_temp[prev_temp.selectedIndex].getAttribute('data-templateId');
	
	var response = await fetch('/add_new_subscription_with_prev_template', {
	    method: 'POST',
	    headers: {
		'Content-Type': 'application/JSON'
	    },
	    body: JSON.stringify(context)
	})
	
	return await response.json();
    }
    catch(err) {
	console.log(err);
	return err;
    }
}

async function add_new_subscription_with_template_file(post_id, upload_temp){
    if(!window.File || !window.FileReader || !window.FileList || !window.Blob){
	console.log("File API not supported by broser");
	$('addSubscriptionMessageDiv').innerText = "Incompatible browser"
	return;
    }
    
    try {
	let fd = new FormData();
	fd.append('upload', upload_temp[0].files[0]);
	fd.append('post_id', post_id);
	
	var response = await fetch('/add_new_subscription_with_template_file', {
	    method: 'POST',
	    body: fd
	})
	
	return await response.json();
    }
    catch(err) {	
	console.log(err);
	return err;
    }
}




function preview_new_subscription(){
    let uploadTemp = $('#uploadTemplate');
    let prevTemp = $('#templateSelect');
    //figure out if user is uploading new template or using previous template
    if(uploadTemp[0].value){
	if(!window.File || !window.FileReader || !window.FileList || !window.Blob){
	    console.log("File API not supoprted by broser");
	    return;
	}
	
	let fileSelected = uploadTemp[0].files;
	
	let fileReader = new FileReader();
	fileReader.onload = function (e) {
	    console.log(fileReader.result);
	}
	fileReader.readAsText(uploadTemp[0].files[0]);
    }
    else{
	template = prevTemp[0][prevTemp[0].selectedIndex].getAttribute('data-templateId');
	fetch_template('/previewTemplate'); 
    }
    console.log(template);
    //	$('#previewModal').modal('toggle');
}

async function fetch_user_subscription_list(){
    try{
	clear_user_subscriptions();
	let response = await fetch('/get_user_subscription_list')
	let res = await response.json();
	remove_spinner($('#subscriptionsContainerSpinner')[0]);
	populate_subscription_table(res);
    }
    catch(err) {
	console.log(err);
    }
}
function populate_subscription_table(res){
    let tbody = document.getElementById('subscriptionTbody');
    res.subscription_list.forEach(sub => {
	let last_mod = new Date(sub.last_modified);
	let last_mod_month = new Intl.DateTimeFormat('en-US', {month: 'short'}).format(last_mod);
	let tr = document.createElement('tr');
	tr.setAttribute('data-subscriptionId', sub.subscriptionId);
	let td1 = document.createElement('td');
	td1.innerText = sub.post;
	tr.appendChild(td1);
	let td2 = document.createElement('td');
	td2.innerText = sub.country;
	tr.appendChild(td2);
	let td3 = document.createElement('td');
	td3.innerText = sub.allowance;
	tr.appendChild(td3);
	let td4 = document.createElement('td');
	td4.innerText = last_mod.getDate() + ' '
	    + last_mod_month + ' '
	    + last_mod.getFullYear();
	tr.appendChild(td4);
	let td5 = document.createElement('td');
	let del_btn = document.createElement('button');
	del_btn.setAttribute('class', ' usa-button usa-button--secondary');
	del_btn.setAttribute('data-subscriptionId', sub.subscriptionId); 
	del_btn.addEventListener('click', delete_subscription);
	let del_btn_text = document.createElement('span');
	del_btn_text.innerText = 'Remove';

	del_btn.appendChild(del_btn_text);
	td5.appendChild(del_btn);
	tr.appendChild(td5);
	
	tbody.appendChild(tr);
    })
    size_table();
}
async function delete_subscription(){
    var context = {};

    var scroll = scroll_save([
	document.getElementsByTagName('body')[0],
	document.getElementById('subscriptionsContainer')
    ]);

    context.subscriptionId = this.getAttribute('data-subscriptionId');

    clear_user_subscriptions();
    show_spinner($('#subscriptionsContainerSpinner')[0]);
    
    let response = await fetch('/delete_subscription', {
	method: 'POST',
	headers: {
	    'Content-Type': 'application/JSON'
	},
	body: JSON.stringify(context)
    })
    await fetch_user_subscription_list();
    
    scroll_restore(scroll);
}
