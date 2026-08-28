// A small API with real token-based auth - deliberately shaped to require
// the exact multi-request workflow (log in, capture a token, use it on
// later requests) that Postman's collection variables and pre-request/test
// scripts exist to automate. Written in Go using only the standard library
// - no framework needed for an API this size, and it demonstrates that
// Postman/Newman test a real HTTP API regardless of what language serves it.
package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
)

type Order struct {
	ID       int    `json:"id"`
	Item     string `json:"item"`
	Quantity int    `json:"quantity"`
}

var (
	mu            sync.Mutex
	activeTokens  = map[string]bool{}
	orders        = []Order{
		{ID: 1, Item: "Mechanical keyboard", Quantity: 1},
		{ID: 2, Item: "USB-C hub", Quantity: 2},
	}
	nextID = 3
)

const (
	validUsername = "alice"
	validPassword = "hunter2"
)

func generateToken() string {
	b := make([]byte, 16)
	rand.Read(b)
	return "tok_" + hex.EncodeToString(b)
}

func requireAuth(r *http.Request) bool {
	header := r.Header.Get("Authorization")
	if !strings.HasPrefix(header, "Bearer ") {
		return false
	}
	token := strings.TrimPrefix(header, "Bearer ")
	mu.Lock()
	defer mu.Unlock()
	return activeTokens[token]
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(body)
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	var creds struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	json.NewDecoder(r.Body).Decode(&creds)

	if creds.Username != validUsername || creds.Password != validPassword {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"message": "Invalid credentials"})
		return
	}

	token := generateToken()
	mu.Lock()
	activeTokens[token] = true
	mu.Unlock()

	writeJSON(w, http.StatusOK, map[string]any{"token": token, "expiresInSeconds": 3600})
}

func ordersHandler(w http.ResponseWriter, r *http.Request) {
	if !requireAuth(r) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"message": "Missing or invalid token"})
		return
	}

	switch r.Method {
	case http.MethodGet:
		mu.Lock()
		defer mu.Unlock()
		writeJSON(w, http.StatusOK, orders)

	case http.MethodPost:
		var body struct {
			Item     string `json:"item"`
			Quantity int    `json:"quantity"`
		}
		json.NewDecoder(r.Body).Decode(&body)
		if body.Item == "" || body.Quantity <= 0 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"message": "item and a positive quantity are required"})
			return
		}
		mu.Lock()
		order := Order{ID: nextID, Item: body.Item, Quantity: body.Quantity}
		nextID++
		orders = append(orders, order)
		mu.Unlock()
		writeJSON(w, http.StatusCreated, order)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func orderByIDHandler(w http.ResponseWriter, r *http.Request) {
	if !requireAuth(r) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"message": "Missing or invalid token"})
		return
	}

	idStr := strings.TrimPrefix(r.URL.Path, "/orders/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"message": "invalid id"})
		return
	}

	mu.Lock()
	defer mu.Unlock()
	for _, o := range orders {
		if o.ID == id {
			writeJSON(w, http.StatusOK, o)
			return
		}
	}
	writeJSON(w, http.StatusNotFound, map[string]string{"message": "Order not found"})
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/login", loginHandler)
	mux.HandleFunc("/orders", ordersHandler)
	mux.HandleFunc("/orders/", orderByIDHandler)

	port := 4002
	fmt.Printf("Orders API running at http://localhost:%d\n", port)
	fmt.Println(`Login with POST /login {"username": "alice", "password": "hunter2"}`)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", port), mux))
}
