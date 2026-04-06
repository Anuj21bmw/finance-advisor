"""
RAGAS Evaluation for the Finance Advisor RAG pipeline.
Measures: Faithfulness, Answer Relevance, Context Recall, Context Precision.

Usage:
    python evaluation/ragas_eval.py
"""
import json
from pathlib import Path
from typing import List, Dict

from datasets import Dataset
from loguru import logger


# ── Evaluation Dataset ────────────────────────────────────────────────────────

EVAL_QUESTIONS = [
    {
        "question": "What are my top 3 spending categories?",
        "ground_truth": "The top 3 spending categories are rent (₹28,000/month), EMIs (₹25,500), and SIP investments (₹26,000).",
    },
    {
        "question": "How much can I save in tax using 80C this year?",
        "ground_truth": "Under Section 80C, you can invest up to ₹1,50,000 per year. Additional ₹50,000 can be saved via NPS under Section 80CCD(1B). Combined maximum deduction is ₹2,00,000.",
    },
    {
        "question": "What is the maximum 80C deduction I can claim?",
        "ground_truth": "The maximum deduction under Section 80C is ₹1,50,000 per financial year.",
    },
    {
        "question": "How does ELSS compare to PPF for tax saving?",
        "ground_truth": "ELSS has a 3-year lock-in with market-linked returns (~15-20% historically). PPF has 15-year lock-in with guaranteed 7.1% interest and full EEE tax status. ELSS is better for higher returns; PPF for guaranteed, tax-free corpus.",
    },
    {
        "question": "What is the LTCG tax rate on equity mutual funds?",
        "ground_truth": "Long-term capital gains on equity mutual funds held for more than 12 months are taxed at 12.5% after an exemption of ₹1,25,000 per year (as per Budget 2024).",
    },
]


# ── Run Evaluation ────────────────────────────────────────────────────────────

def generate_answers(questions: List[Dict]) -> List[Dict]:
    """Generate answers and contexts using the RAG pipeline."""
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent))

    from src.rag.retriever import hybrid_retrieve, format_context
    from src.utils.config import config
    from langchain_groq import ChatGroq
    from langchain_core.messages import HumanMessage, SystemMessage

    llm = ChatGroq(api_key=config.GROQ_API_KEY, model=config.LLM_MODEL, temperature=0.0)

    results = []
    for item in questions:
        question = item["question"]
        logger.info(f"Evaluating: {question}")

        try:
            # Retrieve context
            docs = hybrid_retrieve(question, top_k=5, namespace="regulations")
            docs += hybrid_retrieve(question, top_k=3, namespace="bank_statements")

            contexts = [doc["text"] for doc in docs]
            context_str = format_context(docs)

            # Generate answer
            response = llm.invoke([
                SystemMessage(content="You are a financial advisor. Answer based only on the provided context."),
                HumanMessage(content=f"Context:\n{context_str}\n\nQuestion: {question}\nAnswer concisely:"),
            ])
            answer = response.content

            results.append({
                "question": question,
                "answer": answer,
                "contexts": contexts,
                "ground_truth": item["ground_truth"],
            })

        except Exception as e:
            logger.error(f"Failed for '{question}': {e}")
            results.append({
                "question": question,
                "answer": f"Error: {e}",
                "contexts": [],
                "ground_truth": item["ground_truth"],
            })

    return results


def run_ragas_evaluation():
    """Run RAGAS metrics on the generated answers."""
    from ragas import evaluate
    from ragas.metrics import (
        faithfulness,
        answer_relevancy,
        context_recall,
        context_precision,
    )

    logger.info("Generating answers for evaluation dataset...")
    results = generate_answers(EVAL_QUESTIONS)

    dataset = Dataset.from_list(results)

    logger.info("Running RAGAS evaluation...")
    scores = evaluate(
        dataset=dataset,
        metrics=[
            faithfulness,
            answer_relevancy,
            context_recall,
            context_precision,
        ],
    )

    print("\n" + "="*60)
    print("RAGAS EVALUATION RESULTS")
    print("="*60)
    df = scores.to_pandas()
    print(df.to_string())

    print("\nAggregate Scores:")
    print("-"*40)
    for metric in ["faithfulness", "answer_relevancy", "context_recall", "context_precision"]:
        if metric in df.columns:
            avg = df[metric].mean()
            status = "✅ PASS" if avg > 0.7 else "⚠️ NEEDS IMPROVEMENT"
            print(f"  {metric:30s}: {avg:.3f} {status}")

    # Save results
    output_path = Path(__file__).parent / "ragas_results.json"
    df.to_json(output_path, orient="records", indent=2)
    logger.success(f"Results saved to {output_path}")

    return scores


# ── Custom Metrics (no API needed) ───────────────────────────────────────────

def custom_faithfulness_score(answer: str, contexts: List[str]) -> float:
    """
    Simple keyword-based faithfulness check.
    Checks what fraction of key terms in the answer appear in context.
    """
    import re
    answer_words = set(re.findall(r'\b\w{4,}\b', answer.lower()))
    context_text = " ".join(contexts).lower()
    context_words = set(re.findall(r'\b\w{4,}\b', context_text))

    if not answer_words:
        return 0.0

    overlap = answer_words & context_words
    return len(overlap) / len(answer_words)


def custom_answer_relevancy_score(question: str, answer: str) -> float:
    """
    Simple relevancy score based on keyword overlap between question and answer.
    """
    import re
    q_words = set(re.findall(r'\b\w{4,}\b', question.lower()))
    a_words = set(re.findall(r'\b\w{4,}\b', answer.lower()))

    if not q_words:
        return 0.0

    overlap = q_words & a_words
    return min(1.0, len(overlap) / len(q_words) * 2)  # normalize


def run_custom_evaluation():
    """Run custom evaluation metrics that don't require RAGAS API."""
    logger.info("Running custom evaluation metrics...")
    results = generate_answers(EVAL_QUESTIONS)

    print("\n" + "="*60)
    print("CUSTOM EVALUATION RESULTS")
    print("="*60)

    total_faith = total_rel = 0
    for i, result in enumerate(results, 1):
        faith = custom_faithfulness_score(result["answer"], result["contexts"])
        rel = custom_answer_relevancy_score(result["question"], result["answer"])

        total_faith += faith
        total_rel += rel

        print(f"\nQ{i}: {result['question']}")
        print(f"  Faithfulness: {faith:.2f} | Relevancy: {rel:.2f}")
        print(f"  Answer: {result['answer'][:150]}...")

    n = len(results)
    print(f"\nAverage Faithfulness:  {total_faith/n:.3f}")
    print(f"Average Relevancy:     {total_rel/n:.3f}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["ragas", "custom"], default="custom",
                        help="Evaluation mode: ragas (requires API) or custom (local)")
    args = parser.parse_args()

    if args.mode == "ragas":
        run_ragas_evaluation()
    else:
        run_custom_evaluation()
