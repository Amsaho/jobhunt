import { Application } from "../models/application.model.js";
import { Job } from "../models/job.model.js";
import { Company } from "../models/company.model.js";
import { User } from "../models/user.model.js";
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
const sendConfirmationEmail = async (userEmail, jobTitle, companyName, logoUrl) => {
    const subject = 'Job Application Confirmation';

    // HTML email body with company logo and name
    const htmlBody = `
        <html>
        <body>
            <div style="text-align: center;">
                <img src="${logoUrl}" alt="${companyName} Logo" style="width: 100px; height: auto;">
                <h2>${companyName}</h2>
            </div>
            <p>Dear Applicant,</p>
            <p>Thank you for applying for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>
            <p>Your application has been successfully submitted.</p>
            <p>Due to the high volume of applications, we will carefully review your profile and sincerely consider you for applicable roles.</p>
            <p>Best regards,</p>
            <p>The Hiring Team,</p>
            <strong>${companyName}</strong>
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

// Function to send selection email
const sendSelectionEmail = async (userEmail, jobTitle, companyName, logoUrl) => {
    const subject = 'Congratulations! Your Application Has Been Accepted';

    // HTML email body with company logo and name
    const htmlBody = `
        <html>
        <body>
            <div style="text-align: center;">
                <img src="${logoUrl}" alt="${companyName} Logo" style="width: 100px; height: auto;">
                <h2>${companyName}</h2>
            </div>
            <p>Dear Applicant,</p>
            <p>We are pleased to inform you that your application for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been accepted. Congratulations!</p>
            <p>Our team will contact you shortly to discuss the next steps in the hiring process.</p>
            <p>Best regards,</p>
            <p>The Hiring Team,</p>
            <strong>${companyName}</strong>
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
        console.log('Selection email sent successfully!');
    } catch (error) {
        console.error('Error sending selection email:', error);
    }
};

// Function to send rejection email
const sendRejectionEmail = async (userEmail, jobTitle, companyName, logoUrl) => {
    const subject = 'Application Status Update';

    // HTML email body with company logo and name
    const htmlBody = `
        <html>
        <body>
            <div style="text-align: center;">
                <img src="${logoUrl}" alt="${companyName} Logo" style="width: 100px; height: auto;">
                <h2>${companyName}</h2>
            </div>
            <p>Dear Applicant,</p>
            <p>Thank you for applying for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>
            <p>After careful consideration, we regret to inform you that your application has not been selected for further processing.</p>
            <p>We appreciate your interest in our organization and encourage you to apply for future opportunities that match your skills and experience.</p>
            <p>Best regards,</p>
            <p>The Hiring Team,</p>
            <strong>${companyName}</strong>
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
        console.log('Rejection email sent successfully!');
    } catch (error) {
        console.error('Error sending rejection email:', error);
    }
};

// Example route to send a confirmation email


// Example route to send a rejection email

// Start the server

export const applyJob = async (req, res) => {
    try {
        const userId = req.id;
        const jobId = req.params.id;

        if (!jobId) {
            return res.status(400).json({
                message: "Job id is required.",
                success: false
            });
        }

        // Check if the user has already applied for the job
        const existingApplication = await Application.findOne({ job: jobId, applicant: userId });
        const user = await User.findById(userId); // Fetch the user details

        if (existingApplication) {
            return res.status(400).json({
                message: "You have already applied for this job.",
                success: false
            });
        }

        // Check if the job exists and populate the company details
        const job = await Job.findById(jobId).populate('company');
        if (!job) {
            return res.status(404).json({
                message: "Job not found.",
                success: false
            });
        }

        // Create a new application
        const newApplication = await Application.create({
            job: jobId,
            applicant: userId,
        });

        // Add the application to the job's applications array
        job.applications.push(newApplication._id);
        await job.save();

        // Fetch the company details
        const company = await Company.findById(job.company._id);

        // Send confirmation email
        try {
            await sendConfirmationEmail(
                user.email, // User's email
                job.title,  // Job title
                company.name, // Company name
                company.logo // Company logo URL
            );
        } catch (error) {
            console.log("Error sending confirmation email:", error);
        }

        return res.status(201).json({
            message: "Job applied successfully.",
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
export const getAppliedJobs = async (req,res) => {
    try {
        const userId = req.id;
        const application = await Application.find({applicant:userId}).sort({createdAt:-1}).populate({
            path:'job',
            options:{sort:{createdAt:-1}},
            populate:{
                path:'company',
                options:{sort:{createdAt:-1}},
            }
        });
        if(!application){
            return res.status(404).json({
                message:"No Applications",
                success:false
            })
        };
        return res.status(200).json({
            application,
            success:true
        })
    } catch (error) {
        console.log(error);
    }
}
// admin dekhega kitna user ne apply kiya hai
export const getApplicants = async (req,res) => {
    try {
        const jobId = req.params.id;
        const job = await Job.findById(jobId).populate({
            path:'applications',
            options:{sort:{createdAt:-1}},
            populate:{
                path:'applicant'
            }
        });
        if(!job){
            return res.status(404).json({
                message:'Job not found.',
                success:false
            })
        };
        return res.status(200).json({
            job, 
            succees:true
        });
    } catch (error) {
        console.log(error);
    }
}
export const updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const applicationId = req.params.id;

        if (!status) {
            return res.status(400).json({
                message: 'Status is required.',
                success: false
            });
        }

        // Find the application by ID and populate job and applicant details
        const application = await Application.findById(applicationId)
            .populate('job')
            .populate('applicant');

        if (!application) {
            return res.status(404).json({
                message: "Application not found.",
                success: false
            });
        }

        // Update the status
        application.status = status.toLowerCase();
        await application.save();

        // Fetch company details
        const company = await Company.findById(application.job.company);

        // Send email based on status
        if (status.toLowerCase() === 'accepted') {
            await sendSelectionEmail(
                application.applicant.email, // Applicant's email
                application.job.title,       // Job title
                company.name,                 // Company name
                company.logo                  // Company logo URL
            );
        } else if (status.toLowerCase() === 'rejected') {
            await sendRejectionEmail(
                application.applicant.email,  // Applicant's email
                application.job.title,        // Job title
                company.name,                 // Company name
                company.logo                  // Company logo URL
            );
        }

        return res.status(200).json({
            message: "Status updated successfully.",
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