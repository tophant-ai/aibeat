package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

type registration struct {
	SchemaVersion   string   `json:"schema_version"`
	ID              string   `json:"id"`
	Version         string   `json:"version"`
	ProtocolVersion string   `json:"protocol_version"`
	Target          string   `json:"target"`
	Capabilities    []string `json:"capabilities"`
}

type runRequest struct {
	RunID  string         `json:"run_id"`
	Prompt string         `json:"prompt"`
	Vars   map[string]any `json:"vars"`
}

func main() {
	adapterID := env("AGENTBEAT_ADAPTER_ID", "example/minimal-go")
	adapterVersion := env("AGENTBEAT_ADAPTER_VERSION", "1.0.0")
	protocolVersion := env("AGENTBEAT_PROTOCOL_VERSION", "agentbeat.eval.v1")
	target := env("AGENTBEAT_TARGET", adapterID)
	manifest := registration{
		SchemaVersion:   "agentbeat.adapter.v1",
		ID:              adapterID,
		Version:         adapterVersion,
		ProtocolVersion: protocolVersion,
		Target:          target,
		Capabilities:    []string{"text", "trace-events"},
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(writer http.ResponseWriter, request *http.Request) {
		if request.Method != http.MethodGet {
			writeJSON(writer, http.StatusMethodNotAllowed, map[string]any{"error": "method not allowed"})
			return
		}
		writeJSON(writer, http.StatusOK, map[string]any{
			"ok":           true,
			"adapter":      adapterID,
			"registration": manifest,
		})
	})
	mux.HandleFunc("/v1/eval/runs", func(writer http.ResponseWriter, request *http.Request) {
		if request.Method != http.MethodPost {
			writeJSON(writer, http.StatusMethodNotAllowed, map[string]any{"error": "method not allowed"})
			return
		}
		var input runRequest
		if err := json.NewDecoder(request.Body).Decode(&input); err != nil || input.Prompt == "" {
			writeJSON(writer, http.StatusBadRequest, map[string]any{"error": "prompt is required"})
			return
		}
		if input.RunID == "" {
			input.RunID = fmt.Sprintf("run_%d", time.Now().UnixMilli())
		}
		answer := "Echo: " + input.Prompt
		now := time.Now().UnixMilli()
		runtimeEvents := []map[string]any{
			{
				"event_type":   "run_started",
				"source":       "minimal-go",
				"timestamp_ms": now,
			},
			{
				"event_type":   "final_answer",
				"source":       "minimal-go",
				"timestamp_ms": now,
				"text":         answer,
			},
		}
		traceEvents := make([]map[string]any, 0, len(runtimeEvents))
		for index, event := range runtimeEvents {
			traceEvents = append(traceEvents, map[string]any{
				"id":           fmt.Sprintf("%s:trace:%d", input.RunID, index),
				"run_id":       input.RunID,
				"event_index":  index,
				"event_type":   event["event_type"],
				"source":       event["source"],
				"timestamp_ms": event["timestamp_ms"],
				"payload":      event,
			})
		}
		observation := map[string]any{
			"target_type":    "agent",
			"answer":         answer,
			"runtime_events": runtimeEvents,
			"trace_events":   traceEvents,
			"vars":           input.Vars,
		}
		observationJSON, _ := json.Marshal(observation)
		writeJSON(writer, http.StatusOK, map[string]any{
			"run_id":                 input.RunID,
			"status":                 "completed",
			"answer":                 answer,
			"judge_observation":      observation,
			"judge_observation_text": string(observationJSON),
			"eval_run": map[string]any{
				"id":               input.RunID,
				"status":           "succeeded",
				"protocol_version": protocolVersion,
				"target":           target,
			},
			"runtime_events": runtimeEvents,
			"trace_events":   traceEvents,
			"artifact_manifest": map[string]any{
				"run_id":    input.RunID,
				"artifacts": []any{},
			},
		})
	})

	host := env("AGENTBEAT_ADAPTER_HOST", "127.0.0.1")
	port := env("AGENTBEAT_ADAPTER_PORT", "8091")
	if err := http.ListenAndServe(host+":"+port, mux); err != nil {
		panic(err)
	}
}

func env(name string, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

func writeJSON(writer http.ResponseWriter, status int, payload any) {
	writer.Header().Set("content-type", "application/json")
	writer.WriteHeader(status)
	_ = json.NewEncoder(writer).Encode(payload)
}
