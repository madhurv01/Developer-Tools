#!/usr/bin/env python3
# The actual point of Hugging Face, demonstrated directly: real, pretrained,
# open-source models - downloaded once from the Hub, then run entirely on
# your own machine, no API key, no per-request cost, no data ever leaving
# your computer. This is a genuinely different value proposition from a
# hosted LLM API (like this repo's Groq entry) - here you're running an
# actual open-source model file yourself, not calling someone else's server.
#
# First run downloads the model weights (a few hundred MB) and caches them
# under ~/.cache/huggingface - every run after that is fully offline.

from transformers import pipeline

TICKETS = [
    "This app is amazing, the new dashboard update is exactly what our team needed!",
    "I've been waiting three days for a refund and nobody has responded. Extremely frustrating.",
    "Could you add support for exporting reports as CSV? Would be a nice addition.",
    "The mobile app just crashes every time I try to open the settings page.",
]

# The categories this ticket could fall into - zero-shot classification
# lets you define your OWN labels at inference time, without ever training
# or fine-tuning a model for this specific task.
CANDIDATE_LABELS = ["billing", "bug report", "feature request", "praise"]


def main():
    print("Loading models from the Hugging Face Hub (cached locally after the first run)...\n")

    # A model fine-tuned specifically for sentiment - one line of code runs
    # a real, trained neural network, no ML expertise required to use it.
    sentiment_classifier = pipeline(
        "sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english"
    )

    # A general-purpose zero-shot model - genuinely useful because you
    # didn't have to train or fine-tune anything for YOUR specific
    # categories; you just describe them at inference time.
    zero_shot_classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

    for i, ticket in enumerate(TICKETS, start=1):
        sentiment = sentiment_classifier(ticket)[0]
        category = zero_shot_classifier(ticket, CANDIDATE_LABELS)

        top_label = category["labels"][0]
        top_score = category["scores"][0]

        print(f"--- Ticket {i} ---")
        print(f'Text: "{ticket}"')
        print(f"Sentiment: {sentiment['label']} (confidence: {sentiment['score']:.2f})")
        print(f"Category: {top_label} (confidence: {top_score:.2f})")
        print()


if __name__ == "__main__":
    main()
