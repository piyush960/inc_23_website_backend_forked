import nodemailer from 'nodemailer';
import { officialEmails } from '../../static/adminData.mjs';
import { getJudgingSlots } from '../../static/eventsData.mjs';
import emailTemplates from './htmlGenerators.email.mjs';
import { writeFileSync } from 'fs';

const env = process.env

/**
 * Provides email services for various event and judge-related notifications.
 *
 * @returns {Object} An object containing email service functions.
 */
function emailService() {
    // Create a transporter for event-related emails using Gmail
    const eventEmailTransporter = nodemailer.createTransport({
        pool: true,
        service: 'gmail',
        port: 465,
        auth: {
            user: officialEmails.get('info'),
            pass: env.INFO_EMAIL_PASSWORD
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    // Create a transporter for bulk emails with additional pooling options
    const bulkEmailTransporter = nodemailer.createTransport({
        service: 'gmail',
        port: 465,
        pool: true,
        maxMessages: Infinity,
        maxConnections: 5,
        auth: {
            user: officialEmails.get('impetus'),
            pass: env.IMPETUS_EMAIL_PASSWORD
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    // Create a transporter for judging-related emails using Gmail
    const judgingEmailTransporter = nodemailer.createTransport({
        pool: true,
        service: 'gmail',
        port: 465,
        auth: {
            user: officialEmails.get('judging'),
            pass: env.JUDGE_EMAIL_PASSWORD
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    /**
     * Sends an event registration email with dynamic content.
     *
     * @param {string} event_name - Name of the event.
     * @param {Object} data - Registration data including team id, email, and WhatsApp URL.
     * @returns {Promise<string>} A message indicating success or error.
     */
    async function eventRegistrationEmail(event_name, data) {
        try {
            // Prepare dynamic content for the email template
            const dynamicData = {
                event_name,
                team_id: data.pid,
                tentative_dates: "21st - 23rd March",
                whatsapp_url: data.whatsapp_url,
            };
            // Define email options
            const mailOptions = {
                from: `InC 2025 <${officialEmails.get('info')}>`,
                to: data.email,
                bcc: `${officialEmails.get('queries')},${officialEmails.get(event_name.toLowerCase())}`,
                replyTo: officialEmails.get('queries'),
                subject: `Registered for PICT InC 2025 - ${event_name}`,
                priority: 'high',
                text: 'Email content',
                html: await emailTemplates.eventRegistrationEmail(dynamicData),
            };
            // Send the email and log any errors during sending
            await eventEmailTransporter.sendMail(mailOptions)
                .then(() => {
                    console.log("Email sent successfully in eventRegistrationEmail.");
                })
                .catch((e) => {
                    console.error("Error in eventRegistrationEmail - sendMail:", e);
                });
            return "Emails sent successfully";
        } catch (err) {
            console.error("Error in eventRegistrationEmail:", err);
            // Return an error message instead of throwing
            return "Error sending event registration email";
        }
    }

    /**
     * Sends a judge registration email with dynamic judge details.
     *
     * @param {Object} judge - The judge object containing details and assigned events.
     * @returns {Promise<string>} A message indicating success or error.
     */
    async function judgeRegistrationEmail(judge) {
        try {
            // Retrieve available judging slots based on judge's event(s)
            const slotsData = getJudgingSlots(judge?.events.toLowerCase());
            // Convert judge's slot values to corresponding slot labels and format as a comma-separated string
            judge.slots = judge.slots
                .map(slot => parseInt(slot))
                .sort((a, b) => a - b)
                .map(slot => slotsData[slot])
                .join(", ");
            // Define email options for judge registration
            const mailOptions = {
                from: `InC 2025 Judging <${officialEmails.get('info')}>`,
                to: `${judge.name} <${judge.email}>`,
                // bcc: officialEmails.get('queries'),
                cc: officialEmails.get('judging'),
                replyTo: officialEmails.get('queries'),
                subject: 'Registered for PICT InC 2025 Judging',
                priority: 'high',
                text: 'Email content',
                html: await emailTemplates.judgeRegistrationEmail(judge)
            };
            // Send the email and log any errors during sending
            await eventEmailTransporter.sendMail(mailOptions)
                .then(() => {
                    console.log("Email sent successfully in judgeRegistrationEmail.");
                })
                .catch((e) => {
                    console.error("Error in judgeRegistrationEmail - sendMail:", e);
                });
            return "Judging mail sent successfully";
        } catch (err) {
            console.error("Error in judgeRegistrationEmail:", err);
            return "Error sending judge registration email";
        }
    }

    /**
     * Sends bulk emails in batches.
     *
     * @param {Array<Object>} data - An array of objects containing email and slot information.
     */
    async function sendBulkEmail(data) {
        try {
            const BATCH_SIZE = 50;

            /**
             * Executes sending emails for a batch.
             *
             * @param {Array<Object>} emailArray - An array of email objects for the current batch.
             */
            const executeSendMail = async (emailArray) => {
                try {
                    const allEmailPromises = [];
                    for (let item of emailArray) {
                        const mailOptions = {
                            from: `InC Impetus 2025 <${officialEmails.get('impetus')}>`,
                            to: `${item.email}`,
                            cc: 'InC Queries <queries.pictinc2024@gmail.com>',
                            replyTo: 'InC Queries <queries.pictinc2024@gmail.com>',
                            subject: "InC'25 Slot Confirmation - Impetus",
                            priority: 'high',
                            text: "Email content",
                            html: `<!DOCTYPE html>
                            <html>
                            <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <title>INC 25 - Impetus Event Details</title>
                            </head>
                            <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                                <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                                    <h2 style="text-align: center; color: #333;">You're Invited to INC 25 - Impetus</h2>
                                    <p>Dear Participant,</p>
                                    <p>We are excited to have you at <strong>Impetus</strong>, part of <strong>INC 25</strong>. Below are your event details:</p>
                                    
                                    <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px;">
                                        <p><strong>Event:</strong> Impetus</p>
                                        <p><strong>Date & Time Slot:</strong> <span style="color: #d4621c;"><strong>${item.slot}</strong></span></p>
                                        <p><strong>Location:</strong> PICT, Pune</p>
                                    </div>
                                    
                                    <p>Kindly arrive 15 minutes before your scheduled time. If you have any questions, feel free to reach out.</p>
                                    
                                    <p>Best Regards,</p>
                                    <p><strong>INC 25 Impetus Team</strong></p>
                                </div>
                            </body>
                            </html>
                            `
                        };

                        allEmailPromises.push(
                            bulkEmailTransporter.sendMail(mailOptions)
                                .then(() => {
                                    console.log(`Mail sent to ${item.email}`);
                                })
                                .catch((e) => {
                                    console.error("Error in sendBulkEmail - sendMail:", e);
                                })
                        );
                    }
                    // Await for all promises in the current batch to settle
                    await Promise.allSettled(allEmailPromises);
                    console.log('Completed bulk batch');
                } catch (batchErr) {
                    console.error("Error in executeSendMail (sendBulkEmail):", batchErr);
                    // Do not throw error further
                }
            };

            // Process data in batches with a delay between each batch
            for (let i = 0; i < data.length; i += BATCH_SIZE) {
                const emailArray = data.slice(i, i + BATCH_SIZE);
                setTimeout(() => {
                    console.log(`Sending batch - ${i / BATCH_SIZE}`);
                    executeSendMail(emailArray);
                }, 5000 * (i / BATCH_SIZE));
            }
        } catch (err) {
            console.error("Error in sendBulkEmail:", err);
            // Do not rethrow to prevent server crash
        }
    }

    /**
     * Sends an allocation email for updated judging schedules.
     * (Currently commented out; retains structure for future implementation.)
     *
     * @param {string} event_name - Name of the event.
     * @param {Array} projects - Array of project details.
     * @param {Object} judge - Judge details.
     * @param {Object} judgeCredentials - Credentials for the judge.
     * @returns {Promise} Resolves with email send information.
     */
    async function sendAllocationEmail(event_name, projects, judge, judgeCredentials) {
        try {
            // Future implementation goes here...
        } catch (err) {
            console.error("Error in sendAllocationEmail:", err);
            // Do not throw error further
        }
    }

    // Return the available email service functions 
    return {
        eventRegistrationEmail,
        judgeRegistrationEmail,
        sendAllocationEmail,
        sendBulkEmail,
    };
}

export default emailService;
