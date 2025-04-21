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
                // Process each attendee entry
                for (const attendee of results) {
                    if (!attendee.universityRegNo) {
                        continue; // Skip entries without registration number
                    }
                    
                    // Check if attendee with this registration number already exists
                    const existingAttendee = await Attendee.findOne({ 
                        universityRegNo: attendee.universityRegNo 
                    });
                    
                    if (existingAttendee) {
                        // Only update the QR code, keep rest of the details as is
                        await Attendee.updateOne(
                            { universityRegNo: attendee.universityRegNo },
                            { $set: { qrcodeNumber: attendee.qrcodeNumber } }
                        );
                    } else {
                        // Create new attendee with all details
                        await Attendee.create(attendee);
                    }
                }
                
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

        // Check if attendee with same registration number already exists
        const existingAttendee = await Attendee.findOne({ universityRegNo });

        if (existingAttendee) {
            // Only update the QR code, keeping other details the same
            const updatedAttendee = await Attendee.findOneAndUpdate(
                { universityRegNo },
                { $set: { qrcodeNumber } },
                { new: true }
            );
            
            return res.status(200).json({ 
                message: 'QR code updated for existing registration number',
                attendee: {
                    id: updatedAttendee._id,
                    fullName: updatedAttendee.fullName,
                    universityRegNo: updatedAttendee.universityRegNo,
                    qrcodeNumber: updatedAttendee.qrcodeNumber
                }
            });
        }

        // Check if a different attendee has the same QR code
        const qrCodeExists = await Attendee.findOne({ qrcodeNumber });
        if (qrCodeExists) {
            return res.status(409).json({ 
                message: 'An attendee with this QR code already exists'
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

// Add new functions for student management
export const updateAttendee = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, universityRegNo, branch, email, mobileNo, qrcodeNumber } = req.body;

        // Validate required fields
        if (!fullName || !universityRegNo || !branch || !qrcodeNumber) {
            return res.status(400).json({ 
                message: 'Missing required fields: name, registration number, branch, and QR code are required'
            });
        }

        // Get the current attendee
        const currentAttendee = await Attendee.findById(id);
        if (!currentAttendee) {
            return res.status(404).json({ message: 'Attendee not found' });
        }

        // If trying to change to a different university registration number
        if (currentAttendee.universityRegNo !== universityRegNo) {
            // Check if the new registration number already exists
            const existingRegNo = await Attendee.findOne({ 
                universityRegNo, 
                _id: { $ne: id } 
            });

            if (existingRegNo) {
                return res.status(409).json({ 
                    message: 'Another attendee with this registration number already exists'
                });
            }
        }

        // Check if another attendee already has this QR code
        const existingQRCode = await Attendee.findOne({
            _id: { $ne: id },
            qrcodeNumber
        });

        if (existingQRCode) {
            return res.status(409).json({ 
                message: 'Another attendee with this QR code already exists'
            });
        }

        // Update the attendee
        const updatedAttendee = await Attendee.findByIdAndUpdate(
            id, 
            {
                fullName,
                universityRegNo,
                branch,
                email,
                mobileNo,
                qrcodeNumber
            },
            { new: true }
        );

        res.json({ 
            message: 'Attendee updated successfully',
            attendee: updatedAttendee
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating attendee: ' + error.message });
    }
};

export const deleteAttendee = async (req, res) => {
    try {
        const { id } = req.params;

        // Delete the attendee
        const deletedAttendee = await Attendee.findByIdAndDelete(id);

        if (!deletedAttendee) {
            return res.status(404).json({ message: 'Attendee not found' });
        }

        // Also delete all attendance records for this attendee
        await Attendance.deleteMany({ attendeeId: id });

        res.json({ 
            message: 'Attendee and related attendance records deleted successfully',
            attendee: deletedAttendee
        });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting attendee: ' + error.message });
    }
};

export const getAttendeeDetails = async (req, res) => {
    try {
        const { id } = req.params;
        
        const attendee = await Attendee.findById(id);
        
        if (!attendee) {
            return res.status(404).json({ message: 'Attendee not found' });
        }
        
        // Get attendance records for this attendee
        const attendanceRecords = await Attendance.find({ attendeeId: id })
            .sort({ date: -1 })
            .limit(50);
            
        res.json({
            attendee,
            attendanceRecords
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attendee details: ' + error.message });
    }
};

export const deleteAttendanceRecord = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedRecord = await Attendance.findByIdAndDelete(id);

        if (!deletedRecord) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }

        res.json({ 
            message: 'Attendance record deleted successfully',
            record: deletedRecord
        });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting attendance record: ' + error.message });
    }
};