require('dotenv').config()
const express = require('express')
const app = express()
const ejs = require('ejs')

const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const session = require('express-session')
const cookieParser = require('cookie-parser')

const { UserModel } = require('./database/model/User')
const { ArticleModel } = require('./database/model/Article')

// Setup and middlewear
app.set('view engine', 'ejs');
app.use(express.static('public'))
app.use(bodyParser.urlencoded())
app.use(cookieParser())
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: true }))

/* 
    USER RELATED
*/
app.get('/register', (req, res, next) => {
    res.render('pages/register')
})

app.post('/register', (req, res, next) => {
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(req.body.password, salt, (err, hash) => {
            req.session.username = req.body.username
            req.session.password = hash

            UserModel().then(model => {
                let entry = new model({
                    username: req.body.username,
                    password: hash,
                    role: req.body.role,
                    token:""
                })

                return entry.save()
            }).then(rt => {
                res.redirect('/login?reg=1')
            }).catch(err => {
                res.send("Error 500: " + err)
            })
        })
    })
})

app.get("/login", (req, res, next) => {
    if(req.query.reg === "1"){
        res.render("pages/login", {message: "Sign up successful!"})
    }else{
        res.render("pages/login")
    }
})

app.post('/login', (req, res, next) => {
    UserModel().then(model => {
        return model.find({username: req.body.username})
    }).then(result => {
        bcrypt.compare(req.body.password, result[0].password, (err, success) => {
            if(success){
                const authToken = jwt.sign({
                    username : result[0].username,
                    role : result[0].role
                }, process.env.JWT_SECRET)

                res.cookie('authToken', authToken, { maxAge: 900000, httpOnly: true})
                
                // update the token in the database
                UserModel().then(model => {
                    return model.findOneAndUpdate({username: req.body.username},
                        {token: authToken}
                    )
                }).then(result => {
                    res.redirect("/")
                })
            }else{
                res.render("pages/login", {message: "Password does not match"})
            }
        })
    }).catch(e => {
        res.render("pages/login", {message: "Couldn't find that username"})
    })
})

app.get("/logout", (req, res, next) => {
    res.cookie('authToken', "", { maxAge: 0, httpOnly: true})
    res.redirect("/")
})

/*
    ARTICLE RELATED
*/

// Normal operations

// -- read
app.get("/", (req, res, next) => {
    let findParams = {}

    // pagination
    let page = req.query.page ?? 1
    let startI = (parseInt(page) - 1) * 10
    
    // sorting by date
    let sortField = req.query.sort ?? null
    let order = req.query.order ?? "desc"

    // getting by category
    let category = req.query.category ?? null
    if(category != null){
        findParams.category = category.toUpperCase()
    }
    
    ArticleModel().then(model => {
        if(sortField == null){
            return model.find(findParams).skip(startI).limit(10)
        }else{
            if(sortField === "date" && order === "desc"){
                return model.find(findParams).skip(startI).limit(10).sort({date: -1})
            }else{
                return model.find(findParams).skip(startI).limit(10).sort({date: 1})
            }
        }
    }).then( result => {
        let currentRole = "viewer"

        UserModel().then(model => {
            return model.findOne({token: req.cookies.authToken})
        }).then(user => {
            if(user != null){
                if(user.role === "publisher"){
                    currentRole = "publisher"
                }
                console.log(user.username)
            }
        }).finally(f => {
            res.render('pages/home', {articles: result, role: currentRole})
        })
    })
})

app.get("/article/:id", (req, res, next) => {
    ArticleModel().then(model => {
        return model.findOne({_id: req.params.id})
    }).then( result =>{
        if(result == null){
            res.send("no article found :(")
        }else{
            res.render("pages/article", {article: result})
        }
    })
})

app.get("/search", (req, res, next) => {
    let page = req.query.page ?? 1
    let startI = (parseInt(page) - 1) * 10
    let query = req.query.q ?? null

    // sorting by date
    let sortField = req.query.sort ?? null
    let order = req.query.order ?? "desc"

    if(query == null){
        res.send("Please enter a query")
    }
    
    ArticleModel().then(model => {
        if(sortField == null){
            return model.find({$text: {$search: query}}).skip(startI).limit(10)
        }else{
            if(sortField === "date" && order === "desc"){
                return model.find({$text: {$search: query}}).skip(startI).limit(10).sort({date: -1})
            }else{
                return model.find({$text: {$search: query}}).skip(startI).limit(10).sort({date: 1})
            }
        }
    }).then( result =>
        res.render('pages/home', {articles: result})
    ).catch(err => {
        console.log("---- " + err)
        res.send("Error getting query: " + err)
    })
})


// Publisher operations
function mRoleChecker(req, res, next){
    UserModel().then(model => {
        return model.find({token: req.cookies.authToken})
    }).then(result => {
        if(result.length != 0 && result[0].role === "publisher"){
            next()
        }else{
            res.send("403 - Unauthorized")
        }
    })
}
app.use(mRoleChecker)

// -- create
app.post("/api/article/create", (req, res, next) => {
    ArticleModel().then(model => {
        try{
            const entry = new model({
                category: req.body.category,
                headline: req.body.headline,
                short_description: req.body.short_description,
                authors: req.body.authors,
                date: req.body.date,
                link: req.body.link
            })

            return entry.save()
        }catch(e){
            return new Promise((resolve, reject) => reject("Failed"))
        }
    }).then(result => res.send("Article added successfully"))
    .catch(err => res.send("Could not add article - 500"))
})

// -- update
app.put("/api/article/:id", (req, res, next) => {
    ArticleModel().then(model => {
        try{
            return model.findOneAndUpdate({_id: req.params.id}, {
                category: req.body.category,
                headline: req.body.headline,
                short_description: req.body.short_description,
                authors: req.body.authors,
                date: req.body.date,
                link: req.body.link
            })
        }catch(e){
            return new Promise((resolve, reject) => reject("Failed"))
        }
    }).then(result => {
        if(result == null){
            res.send("Data entry from ID not found")
        }else{
            res.send("Updated successfully")
        }
    })
    .catch(err => res.send("Could not update data - 500 " + err))
})

// -- delete
app.delete("/api/article/:id", (req, res, next) => {
    ArticleModel().then(model => {
        try{
            return model.findOneAndDelete({_id: req.params.id})
        }catch(e){
            return new Promise((resolve, reject) => reject("Failed"))
        }
    }).then(result => {
        if(result == null){
            res.send("Article entry from ID not found")
        }else{
            res.send("Deleted successfully")
        }
    })
    .catch(err => res.send("Could not delete article - 500 " + err))
})

// SERVER
app.listen(process.env.PORT, process.env.HOSTNAME, err => {
    console.log("Listening...")
})