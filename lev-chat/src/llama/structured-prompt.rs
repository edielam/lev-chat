fn create_structured_prompt(context_str: &str, query: &str) -> String {
    format!(
        r#"You are a precise analytical assistant. Follow these steps:

1. First read and analyze this context:
{}

2. Now answer this query: {}

Format your response exactly like this:
ANALYSIS:
[Your analysis of the key points from the context]

ANSWER:
[Your direct answer to the query]

END_RESPONSE"#,
        context_str,
        query
    )
}

// Alternative with JSON structure
fn create_json_prompt(context_str: &str, query: &str) -> String {
    format!(
        r#"Analyze the following context and answer the query. 
Format your response as a valid JSON object with 'analysis' and 'answer' fields.

CONTEXT:
{}

QUERY:
{}

Respond in this exact format:
{{
    "analysis": "your analysis here",
    "answer": "your answer here"
}}
END_JSON"#,
        context_str,
        query
    )
}

// For list-based responses
fn create_list_prompt(context_str: &str, query: &str) -> String {
    format!(
        r#"Based on this context:
{}

Answer this query: {}

Format your response exactly as follows:
KEY_POINTS:
1.
2.
3.

ANSWER:
- 

END_LIST"#,
        context_str,
        query
    )
}
