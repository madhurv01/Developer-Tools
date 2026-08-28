// Real-world pattern: an API service backed by a separate Redis container
// for shared, persistent state (visit counts, rate limits, sessions,
// caches - the same shape used in production systems).
//
// This ONLY works because Docker Compose puts both containers on the same
// virtual network and lets them address each other by service name
// ("redis") instead of an IP address you'd have to hunt down manually.
//
// Written in Go specifically to show off the OTHER real reason people
// reach for Docker: a multi-stage build compiles this into a single
// static binary, so the final image needs no language runtime installed
// at all - see the Dockerfile in this same folder.
package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/redis/go-redis/v9"
)

var (
	rdb = redis.NewClient(&redis.Options{Addr: getRedisAddr()})
	ctx = context.Background()
)

func getRedisAddr() string {
	if addr := os.Getenv("REDIS_ADDR"); addr != "" {
		return addr
	}
	return "redis:6379"
}

func homeHandler(w http.ResponseWriter, r *http.Request) {
	total, err := rdb.Incr(ctx, "total_visits").Result()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	rdb.HIncrBy(ctx, "visits_by_path", "/", 1)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"message":                       "Visit recorded in Redis",
		"totalVisitsAcrossAllRestarts": total,
		"note":                          "Stop and restart the containers - this number will NOT reset, because Redis data lives in a named volume.",
	})
}

func statsHandler(w http.ResponseWriter, r *http.Request) {
	total, _ := rdb.Get(ctx, "total_visits").Result()
	byPath, _ := rdb.HGetAll(ctx, "visits_by_path").Result()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"totalVisits": total,
		"byPath":      byPath,
	})
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func main() {
	http.HandleFunc("/", homeHandler)
	http.HandleFunc("/stats", statsHandler)
	http.HandleFunc("/health", healthHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "4000"
	}
	log.Printf("API listening on http://localhost:%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
