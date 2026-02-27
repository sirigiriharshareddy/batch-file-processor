from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import pandas as pd
import os
import io

app = Flask(__name__)
CORS(app)  # Allow requests from the React frontend

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)


@app.route("/upload", methods=["POST"])
def upload_files():
    """
    Accepts multiple CSV files, combines them into one DataFrame,
    removes duplicate rows, and returns the result as a downloadable CSV.
    """
    # Validate that files were sent
    if "files" not in request.files:
        return jsonify({"error": "No files provided. Please upload at least one CSV."}), 400

    files = request.files.getlist("files")

    if len(files) == 0 or files[0].filename == "":
        return jsonify({"error": "No files selected."}), 400

    dataframes = []

    for file in files:
        # Only accept CSV files
        if not file.filename.endswith(".csv"):
            return jsonify({"error": f"'{file.filename}' is not a CSV file."}), 400

        try:
            df = pd.read_csv(file)
            dataframes.append(df)
        except Exception as e:
            return jsonify({"error": f"Failed to read '{file.filename}': {str(e)}"}), 400

    # Combine all DataFrames into one
    try:
        combined_df = pd.concat(dataframes, ignore_index=True)
    except Exception as e:
        return jsonify({"error": f"Failed to combine files: {str(e)}"}), 500

    # Remove duplicate rows
    combined_df.drop_duplicates(inplace=True)

    # Save the output file
    output_path = os.path.join(OUTPUT_DIR, "final_output.csv")
    combined_df.to_csv(output_path, index=False)

    # Send the file back as a downloadable response
    return send_file(
        output_path,
        mimetype="text/csv",
        as_attachment=True,
        download_name="final_output.csv",
    )


if __name__ == "__main__":
    print("🚀 Batch File Processor backend running on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
