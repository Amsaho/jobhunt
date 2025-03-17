import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import nodemailer from 'nodemailer';

const SMTP_EMAIL=process.env.SMTP_EMAIL
const SMTP_PASSWORD=process.env.SMTP_PASSWORD
const SMTP_SERVER=process.env.SMTP_SERVER
const SMTP_PORT=587



const transporter = nodemailer.createTransport({
    host: SMTP_SERVER,
    port: SMTP_PORT,
    secure: false, // Use TLS
    auth: {
        user: SMTP_EMAIL,
        pass: SMTP_PASSWORD,
    },
});

// Function to send confirmation email
const sendRegistration = async (userEmail,username) => {
    const subject = 'Job Application Confirmation';

    // HTML email body with company logo and name
    const htmlBody = `
        <html>
        <body>
        <div style="text-align: center;">
                <img src="https://res.cloudinary.com/dpdqhtova/image/upload/v1742187205/jobhunt_qn5wpt.jpg" alt="Logo" style="width: 100px; height: auto;">
            </div>
            
            <p>${username} ,</p>
            <p>Your JobHunt account created successfully</p>

            <p>Explore various job opportunities at our portal by logging-in</p>
            <p>Best Regards,</p>
            <p>JobHunt</p>

        </body>
        </html>
    `;

    // Email options
    const mailOptions = {
        from: SMTP_EMAIL,
        to: userEmail,
        subject: subject,
        html: htmlBody,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Confirmation email sent successfully!');
    } catch (error) {
        console.error('Error sending confirmation email:', error);
    }
};

export const register = async (req, res) => {
    try {
        const { fullname, email, phoneNumber, password, role } = req.body;
        const file = req.file;
        if (!fullname || !email || !phoneNumber || !password || !role|| !file) {
            return res.status(400).json({
                message: "All fields are required.",
                success: false
            });
        }

        
        if (!file) {
            return res.status(400).json({
                message: "Profile photo is required.",
                success: false
            });
        }

        const fileUri = getDataUri(file);
        const cloudResponse = await cloudinary.uploader.upload(fileUri.content);

        const user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({
                message: 'User already exists with this email.',
                success: false,
            });
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        await User.create({
            fullname,
            email,
            phoneNumber,
            password: hashedPassword,
            role,
            profile: {
                profilePhoto: cloudResponse.secure_url,
            }
        });
        try {
            await sendRegistration(
                email, 
                fullname)
        } catch (error) {
            console.log("Error sending confirmation email:", error);
        }


        return res.status(201).json({
            message: "Account created successfully.",
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
};
export const login = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Validate required fields
        if (!email || !password || !role) {
            return res.status(400).json({
                message: "All fields are required.",
                success: false
            });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                message: "Incorrect email or password.",
                success: false,
            });
        }

        // Debugging: Log the plaintext and hashed passwords
        console.log("Plaintext Password:", password);
        console.log("Hashed Password:", user.password);

        // Validate password data
        if (!password || !user.password) {
            return res.status(400).json({
                message: "Invalid password data.",
                success: false
            });
        }

        // Validate password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                message: "Incorrect email or password.",
                success: false,
            });
        }

        // Validate role
        if (role.toLowerCase() !== user.role.toLowerCase()) {
            return res.status(400).json({
                message: "Account doesn't exist with this role.",
                success: false
            });
        }

        // Generate JWT token
        const tokenData = {
            userId: user._id
        };
        const token = jwt.sign(tokenData, process.env.SECRET_KEY, { expiresIn: '1d' });

        // Return user data (excluding sensitive information)
        const userData = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profile: user.profile
        };

        return res.status(200)
            .cookie("token", token, { maxAge: 1 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'strict' })
            .json({
                message: `Welcome back, ${user.fullname}`,
                user: userData,
                success: true
            });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
};
export const logout = async (req, res) => {
    try {
        return res.status(200)
            .cookie("token", "", { maxAge: 0 })
            .json({
                message: "Logged out successfully.",
                success: true
            });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
};
export const updateProfile = async (req, res) => {
    try {
        const { fullname, email, phoneNumber, bio, skills } = req.body;

        const file = req.file;
        let cloudResponse;
        if (file) {
            const fileUri = getDataUri(file);
            cloudResponse = await cloudinary.uploader.upload(fileUri.content);
        }

        let skillsArray;
        if (skills) {
            skillsArray = skills.split(",");
        }

        const userId = req.id; // Assuming this is set by authentication middleware
        let user = await User.findById(userId);

        if (!user) {
            return res.status(400).json({
                message: "User not found.",
                success: false
            });
        }

        if (fullname) user.fullname = fullname;
        if (email) user.email = email;
        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (bio) user.profile.bio = bio;
        if (skills) user.profile.skills = skillsArray;

        if (cloudResponse) {
            user.profile.profilePhoto = cloudResponse.secure_url;
        }

        await user.save();

        user = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profile: user.profile
        };

        return res.status(200).json({
            message: "Profile updated successfully.",
            user,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error.",
            success: false
        });
    }
};