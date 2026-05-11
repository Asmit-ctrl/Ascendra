// config_camera.h - Configuration for ESP32-CAM system

#ifndef CONFIG_CAMERA_H
#define CONFIG_CAMERA_H

// ===== PIN DEFINITIONS =====

// I2C Pins
#define I2C_SDA 12
#define I2C_SCL 13

// LCD I2C Address
#define LCD_ADDRESS 0x27
#define LCD_COLS 20
#define LCD_ROWS 4

// Button Pins
#define BTN_UP 14
#define BTN_DOWN 15
#define BTN_SELECT 2
#define BTN_BACK 16

// LED Pins
#define LED_GREEN 33
#define LED_YELLOW 32
#define LED_RED 4  // Note: Conflicts with flash LED

// Buzzer Pin
#define BUZZER_PIN 12  // Shared with I2C SDA (use carefully)

// Flash LED (built-in)
#define FLASH_LED 4

// ===== SYSTEM CONSTANTS =====

// File names on SD card
#define FILE_STUDENTS "/data/students.csv"
#define FILE_ATTENDANCE "/data/attendance.csv"
#define FILE_ASSESSMENTS "/data/assessments.csv"
#define FACE_DATA_DIR "/faces"
#define PHOTO_DIR "/photos"

// Maximum limits
#define MAX_STUDENTS 50
#define MAX_NAME_LENGTH 30
#define MAX_FACES_IN_RAM 7  // ESP32 memory limitation

// Course days
#define NUM_COURSE_DAYS 10

// Assessment status codes
#define STATUS_NOT_STARTED 0
#define STATUS_SUBMITTED 1
#define STATUS_GRADED 2

// Buzzer tones
#define TONE_SUCCESS 1000
#define TONE_ERROR 200
#define TONE_WARNING 500
#define TONE_DURATION 100

// Face recognition settings
#define FACE_RECOGNITION_THRESHOLD 0.6  // Lower = more strict
#define ENROLLMENT_SAMPLES 20  // Number of face samples to capture
#define FACE_DETECTION_INTERVAL 500  // ms between detections

// Camera settings
#define CAMERA_FRAME_SIZE FRAMESIZE_QVGA  // 320x240
#define CAMERA_JPEG_QUALITY 10  // 0-63, lower = better quality
#define CAMERA_FB_COUNT 2  // Frame buffer count

// ===== COURSE DAY TITLES =====
const char* COURSE_DAY_TITLES[NUM_COURSE_DAYS] = {
  "Weather Station",
  "Soil Moisture",
  "Data Logger",
  "Bluetooth Comm",
  "Line Robot",
  "Servo Arm",
  "Smart Home",
  "IoT Cloud",
  "Drone Autopilot",
  "Machine Learning"
};

// ===== DATA STRUCTURES =====

struct Student {
  int id;
  int faceId;  // Face recognition ID
  char name[MAX_NAME_LENGTH];
  char enrollDate[11];  // YYYY-MM-DD
  bool active;
};

struct AttendanceRecord {
  int studentId;
  char name[MAX_NAME_LENGTH];
  char date[11];  // YYYY-MM-DD
  char time[9];   // HH:MM:SS
  char status[10]; // Present/Absent/Late
  float confidence;  // Face recognition confidence
};

struct Assessment {
  int studentId;
  char name[MAX_NAME_LENGTH];
  int courseDayId;  // 1-10
  char dayTitle[20];
  int status;  // 0=Not Started, 1=Submitted, 2=Graded
  int score;   // 0-100
  char assessedDate[11];  // YYYY-MM-DD
};

struct StudentProgress {
  int studentId;
  char name[MAX_NAME_LENGTH];
  int completedDays;
  float completionPercentage;
  float averageScore;
  int totalGraded;
  int attendanceCount;
};

// ===== WEB SERVER SETTINGS =====
#define WEB_SERVER_PORT 80
#define STREAM_SERVER_PORT 81

// ===== WIFI SETTINGS =====
#define WIFI_CONNECT_TIMEOUT 20000  // 20 seconds
#define AP_SSID "TeacherCam_Setup"
#define AP_PASSWORD "12345678"

#endif // CONFIG_CAMERA_H
