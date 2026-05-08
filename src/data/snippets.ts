export const pythonCode = `import base64
import json
import os
import random
from datetime import datetime
from flask import Flask, request, jsonify
from google.cloud import bigquery
from google.cloud import storage

app = Flask(__name__)

# Initialize GCP clients
# NOTE: BIGQUERY_DATASET and BIGQUERY_TABLE must be set as environment variables
dataset_id = os.environ.get('BIGQUERY_DATASET', 'doc_pipeline')
table_id = os.environ.get('BIGQUERY_TABLE', 'processed_docs')

# Try initializing clients (may fail locally without credentials, but native on Cloud Run)
try:
    bq_client = bigquery.Client()
    storage_client = storage.Client()
except Exception as e:
    print(f"Warning: GCP Clients not initialized. {e}")

def simulate_ocr(file_content):
    """
    Simulates text extraction and metadata tagging for a document.
    """
    word_count = len(file_content.split())
    possible_tags = ['finance', 'legal', 'engineering', 'hr', 'marketing', 'confidential']
    tags = random.sample(possible_tags, k=random.randint(1, 3))
    return word_count, tags

@app.route('/', methods=['POST'])
def process_document():
    """
    Main Cloud Run invocation endpoint triggered by Pub/Sub Push Subscription.
    """
    envelope = request.get_json()
    if not envelope:
        return 'Bad Request: no Pub/Sub message received', 400

    if not isinstance(envelope, dict) or 'message' not in envelope:
        return 'Bad Request: invalid Pub/Sub message format', 400

    pubsub_message = envelope['message']
    
    if isinstance(pubsub_message, dict) and 'data' in pubsub_message:
        message_data = base64.b64decode(pubsub_message['data']).decode('utf-8')
        event = json.loads(message_data)
        
        # GCS Object finalize event payload structure
        bucket_name = event.get('bucket')
        file_name = event.get('name')
        
        if not bucket_name or not file_name:
            return 'Bad Request: bucket or file name missing from event', 400
            
        print(f"Processing file: {file_name} from bucket: {bucket_name}")
        
        try:
            # 1. Fetch file from GCS
            bucket = storage_client.bucket(bucket_name)
            blob = bucket.blob(file_name)
            
            # In a real app, you might download to memory or parse an image to pass to Vision API
            # content = blob.download_as_text()
            
            # For this pipeline, we'll simulate reading random content length
            simulated_content = "Simulated document content pipeline test. " * random.randint(50, 500)
            
            # 2. Process / OCR / Extract
            word_count, tags = simulate_ocr(simulated_content)
            
            # 3. Prepare record for BigQuery
            record = {
                "filename": file_name,
                "processed_date": datetime.utcnow().isoformat(),
                "word_count": word_count,
                "tags": tags,
                "bucket": bucket_name
            }
            
            # 4. Stream to BigQuery
            table_ref = f"{bq_client.project}.{dataset_id}.{table_id}"
            errors = bq_client.insert_rows_json(table_ref, [record])
            
            if not errors:
                print(f"Successfully processed {file_name} and streamed to BigQuery.")
                return jsonify({"status": "success", "file": file_name}), 200
            else:
                print(f"Encountered errors while inserting rows: {errors}")
                return jsonify({"status": "error", "message": "BigQuery insertion failed"}), 500
                
        except Exception as e:
            print(f"Error processing {file_name}: {e}")
            return jsonify({"status": "error", "message": str(e)}), 500

    return 'Bad Request: invalid Pub/Sub message', 400

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    # Note: Use gunicorn for production rather than built-in flask server
    app.run(debug=True, host='0.0.0.0', port=port)
`;

export const requirementsCode = `Flask==3.0.0
gunicorn==21.2.0
google-cloud-storage==2.10.0
google-cloud-bigquery==3.11.0
`;

export const streamlitCode = `import streamlit as st
from google.cloud import bigquery
import os

st.set_page_config(page_title="Document Pipeline Viewer", layout="wide")

st.title("📄 Processed Documents Viewer")
st.markdown("View and filter documents processed by the serverless pipeline.")

# Initialize BigQuery client
@st.cache_resource
def get_bq_client():
    # Will use default credentials (e.g., from Cloud Run service account locally ADC)
    return bigquery.Client()

try:
    client = get_bq_client()
    project_id = client.project
    dataset_id = os.environ.get('BIGQUERY_DATASET', 'doc_pipeline')
    table_id = os.environ.get('BIGQUERY_TABLE', 'processed_docs')
except Exception as e:
    st.warning(f"Could not initialize BigQuery client. Ensure you are running in GCP or have ADC set up. Error: {e}")
    st.stop()

st.sidebar.header("Filters")
tag_filter = st.sidebar.text_input("Filter by Tag", placeholder="e.g. finance, legal")

@st.cache_data(ttl=60)
def fetch_data(tag=""):
    table_ref = f"{project_id}.{dataset_id}.{table_id}"
    
    if tag:
        query = f"""
            SELECT filename, processed_date as upload_date, word_count, tags 
            FROM \\\`{table_ref}\\\`
            WHERE @tag IN UNNEST(tags)
            ORDER BY processed_date DESC
            LIMIT 100
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("tag", "STRING", tag)
            ]
        )
        query_job = client.query(query, job_config=job_config)
    else:
        query = f"""
            SELECT filename, processed_date as upload_date, word_count, tags 
            FROM \\\`{table_ref}\\\`
            ORDER BY processed_date DESC
            LIMIT 100
        """
        query_job = client.query(query)
        
    return query_job.to_dataframe()

with st.spinner("Fetching data from BigQuery..."):
    try:
        df = fetch_data(tag_filter)
        if df.empty:
            st.info("No documents found matching the criteria.")
        else:
            st.dataframe(
                df,
                column_config={
                    "filename": "File Name",
                    "upload_date": st.column_config.DatetimeColumn("Upload Date", format="MMM DD, YYYY, hh:mm a"),
                    "word_count": "Word Count",
                    "tags": st.column_config.ListColumn("Tags")
                },
                use_container_width=True,
                hide_index=True
            )
            st.caption(f"Showing {len(df)} recent documents")
    except Exception as e:
        st.error(f"Failed to fetch data: {e}")
`;

export const streamlitRequirementsCode = `streamlit==1.28.2
google-cloud-bigquery==3.13.0
pandas==2.1.3
db-dtypes==1.1.1
`;

export const dockerfileCode = `FROM python:3.11-slim
ENV PYTHONUNBUFFERED True

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy service code
COPY . .

# Run the web service on container startup using gunicorn
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 main:app
`;

export const terraformCode = `terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  description = "The GCP Project ID"
  type        = string
}

variable "region" {
  description = "The GCP region"
  type        = string
  default     = "us-central1"
}

# 1. Cloud Storage Bucket for incoming documents
resource "google_storage_bucket" "unprocessed_docs" {
  name                        = "\${var.project_id}-incoming-docs"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = true
}

# 2. BigQuery Dataset & Table for Processed Metadata
resource "google_bigquery_dataset" "doc_pipeline" {
  dataset_id                  = "doc_pipeline"
  location                    = var.region
  description                 = "Dataset for Document Processing Pipeline"
}

resource "google_bigquery_table" "processed_docs" {
  dataset_id = google_bigquery_dataset.doc_pipeline.dataset_id
  table_id   = "processed_docs"

  schema = <<EOF
[
  {
    "name": "filename",
    "type": "STRING",
    "mode": "REQUIRED"
  },
  {
    "name": "processed_date",
    "type": "TIMESTAMP",
    "mode": "REQUIRED"
  },
  {
    "name": "word_count",
    "type": "INTEGER",
    "mode": "NULLABLE"
  },
  {
    "name": "tags",
    "type": "STRING",
    "mode": "REPEATED"
  },
  {
    "name": "bucket",
    "type": "STRING",
    "mode": "REQUIRED"
  }
]
EOF
}

# 3. Pub/Sub Topic for GCS notifications
resource "google_pubsub_topic" "gcs_updates" {
  name = "unprocessed-docs-topic"
}

# 4. GCS Notification to Pub/Sub
resource "google_storage_notification" "notification" {
  bucket         = google_storage_bucket.unprocessed_docs.name
  payload_format = "JSON_API_V1"
  topic          = google_pubsub_topic.gcs_updates.id
  event_types    = ["OBJECT_FINALIZE"]
  depends_on     = [google_pubsub_topic_iam_binding.binding]
}

# Give GCS permission to publish to Pub/Sub
data "google_storage_project_service_account" "gcs_account" {}

resource "google_pubsub_topic_iam_binding" "binding" {
  topic   = google_pubsub_topic.gcs_updates.id
  role    = "roles/pubsub.publisher"
  members = ["serviceAccount:\${data.google_storage_project_service_account.gcs_account.email_address}"]
}

# 5. Cloud Run Service (The Python Processor)
resource "google_cloud_run_v2_service" "doc_processor" {
  name     = "doc-processor-service"
  location = var.region

  template {
    containers {
      image = "gcr.io/\${var.project_id}/doc-processor:latest" # Must be built and pushed
      env {
        name  = "BIGQUERY_DATASET"
        value = google_bigquery_dataset.doc_pipeline.dataset_id
      }
      env {
        name  = "BIGQUERY_TABLE"
        value = google_bigquery_table.processed_docs.table_id
      }
    }
    service_account = google_service_account.processor_sa.email
  }
}

# Service Account for Cloud Run
resource "google_service_account" "processor_sa" {
  account_id   = "doc-processor-sa"
  display_name = "Document Processor Service Account"
}

# Grant Cloud Run SA access to read GCS and write to BigQuery
resource "google_project_iam_member" "gcs_reader" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:\${google_service_account.processor_sa.email}"
}

resource "google_project_iam_member" "bq_editor" {
  project = var.project_id
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:\${google_service_account.processor_sa.email}"
}

# 6. Pub/Sub Push Subscription to Cloud Run
resource "google_pubsub_subscription" "cloud_run_subscription" {
  name  = "cloud-run-push-sub"
  topic = google_pubsub_topic.gcs_updates.name

  push_config {
    push_endpoint = google_cloud_run_v2_service.doc_processor.uri
    oidc_token {
      service_account_email = google_service_account.pubsub_invoker_sa.email
    }
  }
  depends_on = [google_cloud_run_v2_service_iam_member.invoker]
}

# Service Account for Pub/Sub to invoke Cloud Run
resource "google_service_account" "pubsub_invoker_sa" {
  account_id   = "pubsub-invoker-sa"
  display_name = "Pub/Sub Invoker Service Account"
}

# Grant Invoker SA permission to invoke the Cloud Run service
resource "google_cloud_run_v2_service_iam_member" "invoker" {
  name     = google_cloud_run_v2_service.doc_processor.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "serviceAccount:\${google_service_account.pubsub_invoker_sa.email}"
}
`;
