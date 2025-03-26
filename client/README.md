# README.md

# React QR Attendance System

This project is a web application built with React that allows for attendance marking through QR code scanning. The application includes an admin panel for managing attendance records and importing data via CSV files.

## Features

- **QR Code Scanning**: Admins can scan QR codes using a webcam or mobile camera to mark attendance.
- **CSV Import**: Admins can import attendance data from CSV files.
- **Admin Dashboard**: An overview of attendance data with navigation to various functionalities.
- **User Authentication**: Secure login for admin access.

## Project Structure

```
react-qr-attendance
├── src
│   ├── components
│   │   ├── Admin
│   │   ├── Auth
│   │   └── Scanner
│   ├── services
│   ├── types
│   ├── utils
│   ├── App.tsx
│   └── index.tsx
├── public
│   └── index.html
├── package.json
└── tsconfig.json
```

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd react-qr-attendance
   ```
3. Install dependencies:
   ```
   npm install
   ```

## Usage

To start the application, run:
```
npm start
```
This will launch the application in your default web browser.

## License

This project is licensed under the MIT License.