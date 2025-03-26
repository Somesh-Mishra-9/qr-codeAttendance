import e from 'express';
import { Attendance, Attendee } from '../models/attendance.model.js';
import { User } from '../models/user.model.js';
import csv from 'csv-parser';
import fs from 'fs';

export const markAttendance = async (req, res) => {
    try {
        const { qrCode, type } = req.body;
        if (!qrCode) {
            return res.status(400).json({ message: 'Invalid QR code' });
        }

        // Find attendee by QR code number
        const attendee = await Attendee.findOne({ qrcodeNumber: qrCode });
        if (!attendee) {
            return res.status(404).json({ message: 'Attendee not found' });
        }

        // Check for existing attendance record in the last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const existingAttendance = await Attendance.findOne({
            attendeeId: attendee._id,
            type,
            date: { $gte: fiveMinutesAgo }
        });

        if (existingAttendance) {
            return res.status(400).json({ 
                message: `Attendance already marked for ${type === 'in' ? 'arrival' : 'departure'} in the last 5 minutes` 
            });
        }

        // Check if there's an "in" record before allowing "out"
        if (type === 'out') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const hasCheckIn = await Attendance.findOne({
                attendeeId: attendee._id,
                type: 'in',
                date: { $gte: today }
            });

            if (!hasCheckIn) {
                return res.status(400).json({ 
                    message: 'Cannot mark departure without first marking arrival for today' 
                });
            }
        }

        const attendance = new Attendance({
            attendeeId: attendee._id,
            type,
            date: new Date()
        });

        await attendance.save();
        
        res.status(201).json({ 
            message: 'Attendance marked successfully',
            attendee: {
                name: attendee.fullName,
                type
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getStats = async (req, res) => {
    try {
        const totalUsers = await Attendee.countDocuments();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayAttendance = await Attendance.countDocuments({
            date: { $gte: today }
        });

        const totalAttendance = await Attendance.countDocuments();

        // Get statistics by branch
        const branchStats = await Attendee.aggregate([
            {
                $group: {
                    _id: "$branch",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get today's attendance details
        const todayDetails = await Attendance.aggregate([
            {
                $match: {
                    date: { $gte: today }
                }
            },
            {
                $lookup: {
                    from: 'attendees',
                    localField: 'attendeeId',
                    foreignField: '_id',
                    as: 'attendee'
                }
            },
            {
                $unwind: '$attendee'
            },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    students: {
                        $push: {
                            name: '$attendee.fullName',
                            regNo: '$attendee.universityRegNo',
                            branch: '$attendee.branch',
                            time: '$date'
                        }
                    }
                }
            }
        ]);

        res.json({
            totalUsers,
            todayAttendance,
            totalAttendance,
            branchStats,
            todayDetails
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching statistics' });
    }
};

export const getHistory = async (req, res) => {
    try {
        const attendance = await Attendance.find()
            .populate('attendeeId', 'fullName universityRegNo branch')
            .sort({ date: -1 })
            .limit(100);
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attendance history' });
    }
};

export const importCSV = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const results = [];
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => {
                // Clean up the mobile number by removing '=' and quotes
                const mobileNo = data['Mobile No']?.replace(/[="']/g, '');
                
                // Parse and validate the date
                let signupDate;
                try {
                    const dateStr = data['Signup Date'];
                    const parsedDate = new Date(dateStr);
                    // Check if the date is valid
                    signupDate = !isNaN(parsedDate.getTime()) ? parsedDate : new Date();
                } catch (error) {
                    // Use current date as fallback
                    signupDate = new Date();
                }
                
                // Format the data
                const attendee = {
                    receiptNo: data['Receipt No'],
                    fullName: data['Full Name'],
                    email: data['Email Id'],
                    mobileNo: mobileNo,
                    ticketType: data['TicketType'],
                    quantity: parseInt(data['Quantity']) || 1,
                    qrcodeNumber: data['qrcodeNumber'],
                    universityRegNo: data['University Registration No'],
                    branch: data['Branch'],
                    signupDate: signupDate,
                    attendeeId: data['Attendee Id']
                };
                results.push(attendee);
            })
            .on('end', async () => {
                // Use updateOne with upsert to avoid duplicates
                const operations = results.map(attendee => ({
                    updateOne: {
                        filter: { qrcodeNumber: attendee.qrcodeNumber },
                        update: { $set: attendee },
                        upsert: true
                    }
                }));

                await Attendee.bulkWrite(operations);
                
                // Clean up the uploaded file
                fs.unlinkSync(req.file.path);
                
                res.json({ 
                    message: 'Attendees imported successfully',
                    count: results.length 
                });
            });
    } catch (error) {
        // Clean up the uploaded file in case of error
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: 'Error importing attendees: ' + error.message });
    }
};

export const getAttendees = async (req, res) => {
    try {
        const attendees = await Attendee.find({})
            .select('qrcodeNumber fullName universityRegNo branch')
            .sort({ fullName: 1 });
        
        res.json(attendees);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attendees list' });
    }
};

export const createAttendee = async (req, res) => {
    try {
        const { 
            fullName, 
            universityRegNo, 
            branch, 
            email, 
            mobileNo,
            qrcodeNumber 
        } = req.body;

        // Validate required fields
        if (!fullName || !universityRegNo || !branch || !qrcodeNumber) {
            return res.status(400).json({ 
                message: 'Missing required fields: name, registration number, branch, and QR code are required'
            });
        }

        // Check if attendee with same QR code or reg number already exists
        const existingAttendee = await Attendee.findOne({
            $or: [
                { qrcodeNumber },
                { universityRegNo }
            ]
        });

        if (existingAttendee) {
            return res.status(409).json({ 
                message: existingAttendee.qrcodeNumber === qrcodeNumber 
                    ? 'An attendee with this QR code already exists' 
                    : 'An attendee with this registration number already exists'
            });
        }

        // Create new attendee
        const attendee = new Attendee({
            fullName,
            universityRegNo,
            branch,
            email,
            mobileNo,
            qrcodeNumber,
            signupDate: new Date()
        });

        await attendee.save();
        
        res.status(201).json({ 
            message: 'Attendee created successfully',
            attendee: {
                id: attendee._id,
                fullName: attendee.fullName,
                universityRegNo: attendee.universityRegNo,
                qrcodeNumber: attendee.qrcodeNumber
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error creating attendee: ' + error.message });
    }
};