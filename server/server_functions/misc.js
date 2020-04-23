var bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'add_pw_to_dotenv';
const Magic = require('mmmagic').Magic;
const db = require('./db_functions.js');
const tm = require('../server_functions/template_manip.js');

//max file upload size set to 4MB. Note mysql medium blob data type allows up to
//16MB blob size, but that seems a bit excessive and unnecessary.
const MAX_FILE_SIZE = 4000000; 
const BYTES_PER_MEGABYTE = 1000000;
const saltRounds = 10;

module.exports = {
    add_user: function(email, pwd, now, res){
	var sql = "INSERT INTO users (`email`, `password`, `created`, `modified`) VALUES (?, ?, ?, ?)"
	//const now = new Date().toISOString().replace(/\..+/, '');
	var inserts = [email, pwd, now, now];
	mysql.pool.query(sql, inserts, function (error, result) {
	    if (error) {
		console.log("error");
		throw error;
		return;
	    }
	    
	});
    },
    jwt_verify: function(tok, jwtSecret=JWT_SECRET){
	return new Promise((resolve, reject) => {
	    jwt.verify(tok, jwtSecret, (err, decoded) => {
		if(err){
		    reject(err);
		}
		resolve(decoded);
	    })
	});
    },
    jwt_sign: function(payload, jwtSecret=JWT_SECRET, expiresIn){
	if(expiresIn){
	    return new Promise((resolve, reject) => {
		jwt.sign(payload, jwtSecret,
			 {expiresIn: expiresIn}, (err, token) => {
		    if(err){
			console.log(err);
			reject(err);
		    }
		    resolve(token);
		})	
	    });
	}
	else{
	    return new Promise((resolve, reject) => {
		jwt.sign(payload, jwtSecret, (err, token) => {
		    if(err){
			console.log(err);
			reject(err);
		    }
		    resolve(token);
		})	
	    });
	}
    },
    /* name: validate_file
       preconditions: file object from multer module that contains information about
                        file that user uploaded, in addition to the actual file
			Buffer
		      context is object in which we will set flags to pass back to
		        client in case that file is invalidated
       postconditions: 
*/
    validate_file: function(file, context){
	return new Promise((resolve, reject) => {
	    var magic = new Magic();

	    magic.detect(file.buffer, (err, result) => {
		if(err){
		    console.log(err);
		    reject(err);
		}
		result = result.toLowerCase();
		if(file.size > MAX_FILE_SIZE){
		    context.errorMessage = `File must be <`
			+ ` ${Math.floor(MAX_FILE_SIZE / BYTES_PER_MEGABYTE)} MB`;
		    reject(context.errorMessage);
		}
		else if(!result.match('microsoft') || (!result.match('word') && !result.match('ooxml'))){
		    context.errorMessage = `Invalid file type: ${result.substring(0, 12)}`;
		    reject(result);
		}
		else resolve();
	    });
	});
    },
    /* name: validate_file
       preconditions: userId is user pk whose credentials we are checking 
                      oldPwd will be checked against db
                      newPwd is pwd that user desires to change to
		      newPwdRe is re-entered pwd by user
		      context is object in which we will set flags to pass back to
		        client in case that pwd is invalidated
       postconditions: oldPwd has been checked against db
                       newPwd has been checked to be at least 8 char, contain 1+
		         lower case, 1+ upper case, 1+ num, 1+ non-alphanumeric
		       context has been set with flags indicating success/failure
       description: upon successful password validation, resolve method is called.
                      else reject method is called
    */
    validate_password: function(userId, oldPwd, newPwd, newPwdRe, context){
	return new Promise((resolve, reject) => {
	    let lowerCase = /[a-z]/g;
	    let upperCase = /[A-Z]/g;
	    let numbers = /[0-9]/g;
	    let minLength = 8;
	    let validPassword = false;
	    let special = /\W|_/g
	    
	    //check for lower case letters in password
	    if(!newPwd.match(lowerCase)){
		context.invalidNewPassword = true;
		context.invalidMessage = 'Must contain one or more lower case characters';
	    }
	    //check for upper case letters in password
	    else if(!newPwd.match(upperCase)){
		context.invalidNewPassword = true;
		context.invalidMessage = 'Must contain one or more upper case characters';
	    }
	    //check for upper case letters in password
	    else if(!newPwd.match(numbers)){
		context.invalidNewPassword = true;
		context.invalidMessage = 'Must contain at least one number';
	    }
	    else if(!newPwd.match(special)){
		context.invalidNewPassword = true;
		context.invalidMessage = 'Must contain at least one special'
		    + ' character (eg ^!@#$%^&*+=._-+)';
	    }
	    else if(newPwd.length < minLength){
		context.invalidNewPassword = true;
		context.invalidMessage = 'Must contain at least 8 characters';
	    }
	    else if(newPwd !== newPwdRe){
		context.invalidNewPasswordRe = true;
		context.invalidMessage = 'Password mismatch';
	    }
	    else{
		//then the new pwd is valid. now check if user entered prev password correctly

		db.get_user_from_id(userId)
		    .then(res => compare_password(oldPwd, res.password))
		    .then(compRes => {
			if(compRes){
			    if(oldPwd != newPwd)//change password
				resolve();
			    else{
				context.invalidNewPassword = true;
				context.invalidMessage = 'New password must be different from previous';
				reject();
			    }
			}
			else{
			    context.invalidOldPassword = true;
			    context.invalidMessage = "Incorrect password";
			    reject();
			}
		    })
		    .catch(err => {
			context.error = err
			reject(err);
		    })
	    }
	    //If we get to this point, user entered invalid newPwd/newPwdRe
	    //We can just reject without an error
	    if(context.invalidNewPassword || context.invalidNewPasswordRe) reject();
	})
    },
    preview_template: function(userId, templateId, context){
	return new Promise((resolve, reject) => {
	    db.get_user_template(userId, templateId)
		.then(response => {
		    if(!response[0]){
			throw(new Error(`Error: template does not exist`
					+ ` (userId=${userId},`
					+ ` templateId=${templateId})`));
		    }
		    context.filename = response[0].name;
		    context.uploaded = response[0].uploaded;
		    return tm.docx_to_pdf(response[0].file);
		})
		.then(pdfBuf => {
		    context.file = pdfBuf;
		    resolve();
		})
		.catch(err => {
		    if(err) console.log(err);
		    reject();
		})
	})
    },
    hash_password: function(pwd){
	return new Promise((resolve, reject) => {
	    bcrypt.hash(pwd, saltRounds, (err, hash) => {
		console.log(hash);
		if(err) reject(err);
		else resolve(hash);
	    })
	})
    },
    /* name: set_layout
       preconditions: req is incoming user request
       context is object
       posconditions: set context.layout, context.loggedIn, context.email
       accordingly if user is logged in.
    */
    set_layout: function(req, context){
	return new Promise((resolve, reject) => {
	    if(req.isAuthenticated()){
		context.layout = 'main.hbs';
		context.loggedIn = true;

		db.get_user_email(req.session.passport.user.user_id)
		    .then(res => {
			context.email = res[0].email;
			resolve();
		    })
		    .catch(err => {
			console.log(err)
			reject();
		    })
	    }
	    else{
		context.layout = 'landingLayout.hbs';
		context.loggedIn = false;
		resolve();
	    }
	});

    }
}

function compare_password(pwd, hashed){
    return new Promise((resolve, reject) => {
	bcrypt.compare(pwd, hashed, (err, result) => {
	    if(err) reject(err);
	    else resolve(result);
	})
    })
}
