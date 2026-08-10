package main

import (
	"net/http"

	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

var otp string = "123456"

func main() {
	router := gin.Default()
	router.POST("/otp", postOneTimePasswordGuess)

	router.Run("localhost:8080")
}

// postOneTimePasswordGuess handles the POST request for OTP verification.
// It compares the string received from the request body and compares to the otp variable defined in the .env file.
func postOneTimePasswordGuess(c *gin.Context) {
	var guess string

	if err := c.BindJSON(&guess); err != nil {
		c.IndentedJSON(http.StatusBadRequest, err)
	}

	if err := godotenv.Load("../.env"); err != nil {
		c.IndentedJSON(http.StatusBadRequest, gin.H{"status": "NO PASSWORD", "provided": guess})
	}

	if guess == os.Getenv("SECRET_OTP") {
		c.IndentedJSON(http.StatusOK, gin.H{"status": "authorized", "provided": guess})
	} else {
		c.IndentedJSON(http.StatusUnauthorized, gin.H{"status": "unauthorized", "provided": guess})
	}

}
