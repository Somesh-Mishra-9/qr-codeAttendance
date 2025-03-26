import mongoose from 'mongoose';

const attendeeSchema = new mongoose.Schema({
    receiptNo: String,
    fullName: String,
    email: String,
    mobileNo: String,
    ticketType: String,
    quantity: Number,
    qrcodeNumber: {
        type: String,
        required: true,
        unique: true
    },
    universityRegNo: String,
    branch: String,
    signupDate: Date,
    attendeeId: String
}, {
    timestamps: true
});

const attendanceSchema = new mongoose.Schema({
    attendeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Attendee',
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    type: {
        type: String,
        enum: ['in', 'out'],
        required: true
    }
}, {
    timestamps: true
});

export const Attendee = mongoose.model('Attendee', attendeeSchema);
export const Attendance = mongoose.model('Attendance', attendanceSchema);