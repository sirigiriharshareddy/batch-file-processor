# ------------------
# Hemanth
#-------------------
"""
===============================================================================
 Batch File Processor — Core Processing Module
 Author  : Batch File Processor
 Version : 2.0.0
 Purpose : Detect, read, validate, combine, and deduplicate CSV files from a
           given directory in a production-ready, performance-optimised manner.
===============================================================================
"""

import os
import time
import logging
from pathlib import Path
from typing import Optional

import pandas as pd

# ---------------------------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------------------------

def setup_logger(log_dir: str = "logs") -> logging.Logger:
    """
    Configure and return the application logger.

    Creates a timestamped log file inside `log_dir` and also streams output
    to the console so the user sees real-time progress messages.
    """
    Path(log_dir).mkdir(parents=True, exist_ok=True)
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    log_file = os.path.join(log_dir, f"batch_processor_{timestamp}.log")

    logger = logging.getLogger("BatchFileProcessor")
    logger.setLevel(logging.DEBUG)

    # Prevent duplicate handlers when the logger is re-initialised
    if logger.handlers:
        logger.handlers.clear()

    fmt = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # File handler — captures every log line
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(fmt)

    # Console handler — shows INFO and above
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(fmt)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    logger.info("Logger initialised. Log file: %s", log_file)
    return logger


# ---------------------------------------------------------------------------
# File Discovery
# ---------------------------------------------------------------------------

def discover_csv_files(directory: str, logger: logging.Logger) -> list[str]:
    """
    Recursively scan `directory` and return a list of absolute paths for
    every *.csv file found.

    Raises:
        FileNotFoundError : if the directory does not exist.
        ValueError        : if no CSV files are found.
    """
    dir_path = Path(directory).resolve()

    if not dir_path.exists():
        logger.error("Directory not found: %s", dir_path)
        raise FileNotFoundError(f"Directory '{dir_path}' does not exist.")

    if not dir_path.is_dir():
        logger.error("Path is not a directory: %s", dir_path)
        raise NotADirectoryError(f"'{dir_path}' is not a directory.")

    csv_files = sorted(dir_path.glob("*.csv"))  # top-level only by default
    file_paths = [str(f) for f in csv_files]

    if not file_paths:
        logger.warning("No CSV files found in: %s", dir_path)
        raise ValueError(f"No CSV files found in '{dir_path}'.")

    logger.info("Discovered %d CSV file(s) in '%s'.", len(file_paths), dir_path)
    for fp in file_paths:
        logger.debug("  Found: %s", fp)

    return file_paths


# ---------------------------------------------------------------------------
# Single-file Reader
# ---------------------------------------------------------------------------

def read_csv_file(
    file_path: str,
    logger: logging.Logger,
    expected_columns: Optional[list[str]] = None,
) -> Optional[pd.DataFrame]:
    """
    Read a single CSV file into a DataFrame with robust error handling.

    Args:
        file_path        : Absolute path to the CSV file.
        logger           : Logger instance.
        expected_columns : If provided, the file's columns are aligned to match
                           this reference schema.  Extra columns are dropped;
                           missing columns are filled with NaN.

    Returns:
        A cleaned DataFrame, or None if the file is empty / unreadable.
    """
    filename = Path(file_path).name
    logger.info("Reading: %s", filename)

    try:
        # Use low_memory=False to avoid mixed-type inference warnings on large files
        df = pd.read_csv(file_path, low_memory=False, encoding="utf-8-sig")
    except pd.errors.EmptyDataError:
        logger.warning("Skipping '%s' — file is empty.", filename)
        return None
    except pd.errors.ParserError as exc:
        logger.error("Parse error in '%s': %s", filename, exc)
        return None
    except UnicodeDecodeError:
        # Fallback encoding for files that are not UTF-8
        logger.warning("UTF-8 decode failed for '%s'. Retrying with 'latin-1'.", filename)
        try:
            df = pd.read_csv(file_path, low_memory=False, encoding="latin-1")
        except Exception as exc:  # pylint: disable=broad-except
            logger.error("Failed to read '%s' with fallback encoding: %s", filename, exc)
            return None
    except OSError as exc:
        logger.error("OS error reading '%s': %s", filename, exc)
        return None

    # --- Guard: empty DataFrame after parsing ---
    if df.empty:
        logger.warning("Skipping '%s' — file contains no data rows.", filename)
        return None

    # --- Normalise column names (strip whitespace, lower-case) ---
    df.columns = [col.strip().lower().replace(" ", "_") for col in df.columns]

    # --- Align columns to the reference schema when provided ---
    if expected_columns:
        expected_norm = [c.strip().lower().replace(" ", "_") for c in expected_columns]

        # Drop columns not in the reference schema
        extra_cols = [c for c in df.columns if c not in expected_norm]
        if extra_cols:
            logger.debug(
                "'%s' has extra column(s) %s — dropping them.", filename, extra_cols
            )
            df.drop(columns=extra_cols, inplace=True)

        # Add missing columns filled with NaN
        for col in expected_norm:
            if col not in df.columns:
                logger.debug(
                    "'%s' missing column '%s' — filling with NaN.", filename, col
                )
                df[col] = pd.NA

        # Reorder to match the reference schema
        df = df[expected_norm]

    # Attach source metadata for traceability
    df["_source_file"] = filename

    logger.info(
        "  ✓ '%s' loaded — %d rows, %d columns.",
        filename,
        len(df),
        len(df.columns) - 1,  # exclude _source_file
    )
    return df


# ---------------------------------------------------------------------------
# Batch Reader & Combiner
# ---------------------------------------------------------------------------

def load_and_combine(
    file_paths: list[str],
    logger: logging.Logger,
) -> tuple[pd.DataFrame, dict]:
    """
    Read all CSV files and concatenate them into a single DataFrame.

    The first successfully loaded file establishes the reference column schema.
    All subsequent files are aligned to that schema.

    Returns:
        combined_df : Raw combined DataFrame (before deduplication).
        stats       : Dictionary with per-file row counts and metadata.
    """
    dataframes: list[pd.DataFrame] = []
    reference_columns: Optional[list[str]] = None
    stats = {
        "files_found": len(file_paths),
        "files_processed": 0,
        "files_skipped": 0,
        "per_file_rows": {},
    }

    for idx, fp in enumerate(file_paths, start=1):
        filename = Path(fp).name
        logger.info("⟶ Processing file %d/%d: %s", idx, len(file_paths), filename)

        df = read_csv_file(fp, logger, expected_columns=reference_columns)

        if df is None:
            stats["files_skipped"] += 1
            stats["per_file_rows"][filename] = 0
            continue

        # Set the reference schema from the first valid file
        if reference_columns is None:
            reference_columns = [c for c in df.columns if c != "_source_file"]
            logger.info("Reference schema set from '%s': %s", filename, reference_columns)

        row_count = len(df)
        stats["per_file_rows"][filename] = row_count
        stats["files_processed"] += 1
        dataframes.append(df)

    if not dataframes:
        raise ValueError("No valid data could be loaded from any of the CSV files.")

    logger.info("Combining %d DataFrame(s) …", len(dataframes))
    combined_df = pd.concat(dataframes, ignore_index=True, sort=False)
    logger.info("Combined DataFrame: %d rows × %d columns.", *combined_df.shape)

    return combined_df, stats


# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------

def remove_duplicates(
    df: pd.DataFrame,
    logger: logging.Logger,
    subset: Optional[list[str]] = None,
) -> tuple[pd.DataFrame, int]:
    """
    Remove duplicate rows from the DataFrame.

    Args:
        df     : Input DataFrame.
        logger : Logger instance.
        subset : Column(s) to consider for duplicate detection.
                 If None, all non-metadata columns are used.

    Returns:
        clean_df        : Deduplicated DataFrame.
        duplicates_removed : Number of rows removed.
    """
    # Exclude internal metadata columns from duplicate comparison
    meta_cols = {"_source_file"}
    if subset is None:
        subset = [c for c in df.columns if c not in meta_cols]

    rows_before = len(df)
    logger.info("Running deduplication on %d rows (key columns: %s) …", rows_before, subset)

    clean_df = df.drop_duplicates(subset=subset, keep="first").reset_index(drop=True)

    duplicates_removed = rows_before - len(clean_df)
    logger.info(
        "Deduplication complete — %d duplicate(s) removed. Rows remaining: %d.",
        duplicates_removed,
        len(clean_df),
    )
    return clean_df, duplicates_removed


# ---------------------------------------------------------------------------
# Output Writer
# ---------------------------------------------------------------------------

def save_output(
    df: pd.DataFrame,
    output_path: str,
    logger: logging.Logger,
    drop_metadata: bool = True,
) -> None:
    """
    Save the final DataFrame to a CSV file.

    Args:
        df            : DataFrame to save.
        output_path   : Destination file path.
        logger        : Logger instance.
        drop_metadata : If True, internal _source_file column is excluded.
    """
    out_path = Path(output_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    export_df = df.copy()
    if drop_metadata and "_source_file" in export_df.columns:
        export_df.drop(columns=["_source_file"], inplace=True)

    export_df.to_csv(out_path, index=False, encoding="utf-8-sig")
    logger.info("Output saved to: %s  (%d rows × %d columns)", out_path, *export_df.shape)


# ---------------------------------------------------------------------------
# Summary Printer
# ---------------------------------------------------------------------------

def print_summary(stats: dict, logger: logging.Logger) -> None:
    """
    Print a formatted processing summary to the console and log file.
    """
    border = "=" * 56
    logger.info(border)
    logger.info("          BATCH FILE PROCESSOR — SUMMARY")
    logger.info(border)
    logger.info("  📁  Files found         : %d", stats["files_found"])
    logger.info("  ✅  Files processed      : %d", stats["files_processed"])
    logger.info("  ⚠️   Files skipped        : %d", stats["files_skipped"])
    logger.info("  📊  Records before dedup : %d", stats["records_before"])
    logger.info("  ✨  Records after dedup  : %d", stats["records_after"])
    logger.info("  🗑️   Duplicates removed   : %d", stats["duplicates_removed"])
    logger.info("  ⏱️   Total time           : %.2f seconds", stats["elapsed_seconds"])
    logger.info("  💾  Output saved to      : %s", stats["output_path"])
    logger.info(border)

    # Per-file breakdown
    logger.info("  Per-file row counts:")
    for fname, count in stats["per_file_rows"].items():
        status = "OK" if count > 0 else "SKIPPED"
        logger.info("    • %-35s %4d rows  [%s]", fname, count, status)
    logger.info(border)


# ---------------------------------------------------------------------------
# Main Orchestrator
# ---------------------------------------------------------------------------

def run_batch_processor(
    input_dir: str = "data",
    output_path: str = "final_output.csv",
    log_dir: str = "logs",
) -> dict:
    """
    Full pipeline: discover → read → combine → deduplicate → save → summarise.

    Args:
        input_dir   : Directory containing source CSV files.
        output_path : Destination path for the cleaned output CSV.
        log_dir     : Directory where log files are written.

    Returns:
        A comprehensive statistics dictionary.
    """
    start_time = time.perf_counter()
    logger = setup_logger(log_dir)

    logger.info("━" * 56)
    logger.info("  Batch File Processor v2.0  |  Starting …")
    logger.info("━" * 56)
    logger.info("  Input directory : %s", os.path.abspath(input_dir))
    logger.info("  Output file     : %s", os.path.abspath(output_path))
    logger.info("━" * 56)

    # 1️⃣  Discover CSV files
    file_paths = discover_csv_files(input_dir, logger)

    # 2️⃣  Load and combine all files
    combined_df, stats = load_and_combine(file_paths, logger)

    # 3️⃣  Remove duplicates
    clean_df, duplicates_removed = remove_duplicates(combined_df, logger)

    # 4️⃣  Save the cleaned output
    save_output(clean_df, output_path, logger)

    # 5️⃣  Compile final statistics
    elapsed = time.perf_counter() - start_time
    
    # Get a preview of the cleaned data (first 10 rows)
    data_preview = clean_df.head(10).to_dict(orient="records")

    stats.update(
        {
            "records_before": len(combined_df),
            "records_after": len(clean_df),
            "duplicates_removed": duplicates_removed,
            "elapsed_seconds": round(elapsed, 4),
            "output_path": os.path.abspath(output_path),
            "data_preview": data_preview,
            "columns": list(clean_df.columns)
        }
    )

    # 6️⃣  Print summary
    print_summary(stats, logger)

    return stats


# ---------------------------------------------------------------------------
# CLI Entry Point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    run_batch_processor()
