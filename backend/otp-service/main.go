package main

import (
	"log"
	"net/http"

	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

type OTPRequest struct {
	Guess string `json:"guess" binding:"required"`
}

func main() {
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("Warning: No .env file found, relying on system environment variables")
	}

	router := gin.Default()
	router.POST("/otp", postOneTimePasswordGuess)

	router.Run("localhost:8080")
}

// postOneTimePasswordGuess handles the POST request for OTP verification.
// It compares the string received from the request body and compares to the otp variable defined in the .env file.
func postOneTimePasswordGuess(c *gin.Context) {
	var req OTPRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.IndentedJSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON format. Expected { \"guess\": \"string\" }"})
		return
	}

	secretOTP := os.Getenv("SECRET_OTP")
	if secretOTP == "" {
		c.IndentedJSON(http.StatusInternalServerError, gin.H{"status": "SERVER ERROR", "message": "One time password value is not configured on the server"})
		return
	}

	if req.Guess == secretOTP {
		c.IndentedJSON(http.StatusOK, gin.H{"status": "authorized", "guess": req.Guess})
	} else {
		c.IndentedJSON(http.StatusUnauthorized, gin.H{"status": "unauthorized", "guess": req.Guess})
	}
}
