const express = require('express');
const User = require('../models/User') //import user database i create
const { body, validationResult } = require('express-validator');
const router = express.Router();
const bcrypt = require('bcryptjs'); //import bcrpt
const jwt = require('jsonwebtoken');
const JWT_SEC =""

const fetchuser=require('../middleware/fetchuser');
router.post('/createuser', [
    body('email', 'Enter a valid name').isEmail(),
    body('name', 'enter a valid email').isLength({ min: 5 }),
    body('usertype', 'enter a user type'),
    body('password')
    .isLength({ min: 5 }).withMessage('Enter a valid password')
    .matches(/^(?=.*[A-Z])(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
    .withMessage('Password must contain at least one uppercase letter and one special character')
], async (req, res) => {
    //if there are errors , returnt that reuest and errros
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array() });
    }
    //Check wether the  user with same email exists

    try {
        let users = await User.findOne({ email: req.body.email });

        if (users) {
            return res.status(400).json({ error: "Sorry user already exists" })
        }
        //create salt for password
        const salt = await bcrypt.genSalt(10);
        //convert code to hash with salt

        secpass = await bcrypt.hash(req.body.password, salt);
          
        let user = await User.create({
            name: req.body.name,
            email: req.body.email,
            password: secpass,
            userType:req.body.usertype,
            })
        //fetch id of user and asign token
        const data = {
            user: {
                id: user.id
            }
        }
        //Send JSON token signed by id to user
        const jwtdata = jwt.sign(data, JWT_SEC, { expiresIn: '4h' });
        res.json({ "login token": jwtdata });
    } catch (error) {
        res.json({ error })
        console.error('Error in login:', error);
        res.status(400).json({ error: "Some error occurred" });
    }



})

//Authenticate a user Login

router.post('/Login', [
    body('email', 'Enter a valid name').isEmail(),
    body('password', 'ener a valid pasword canot be blanlk').exists(),
], async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array() });
    }
    const email = req.body.email;
    const password = req.body.password;
    try {
        let user = await User.findOne({ email: email });
        if (!user) {
            return res.status(400).json({ error: "Please try to login with correct cradentials" });
        }
        //compare password;
        const passofComp = await bcrypt.compare(password, user.password);
        if (!passofComp) {
            return res.status(400).json({ error: "Please try to login with correct cradentials" });
        }

        const data = {
            user: {
                id: user.id
            }
        }
        const jwtdatakey = jwt.sign(data, JWT_SEC,{expiresIn:"4h"});
        res.json(jwtdatakey);
    } catch (error) {
        res.json({ error })
        res.status(500).send("some error occured");
    }

});

//Route 3 Get login user Details POST api/auth/getuser No login required
router.post('/getuser', fetchuser,  async (req, res) => {

    try {
      userId = req.user.id;
      const user = await User.findById(userId).select("-password")
      res.send(user)
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal Server Error");
    }
  })

// Edit User Profile and Change Password
router.post('/edituser', fetchuser, [
    body('name', 'Name is required').notEmpty(),
    body('email', 'Enter a valid email').isEmail(),
    body('userType', 'User type is required').notEmpty(),
    body('password')
        .optional() // Mark password as optional
        .isLength({ min: 5 }).withMessage('Enter a valid password')
        .matches(/^(?=.*[A-Z])(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
        .withMessage('Password must contain at least one uppercase letter and one special character')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array() });
    }

    try {
        const { id } = req.user;
        const { name, email, userType, password } = req.body;

        // Update user information
        const updateFields = { name, email, userType };
        if (password) {
            // Hash the new password and update it
            const hashedPassword = await bcrypt.hash(password, 10);
            updateFields.password = hashedPassword;
        }

        await User.findByIdAndUpdate(id, updateFields);

        res.json({ message: 'User information updated successfully' });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});


module.exports = router; 