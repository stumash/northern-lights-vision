provider "aws" {
    version = "~> 2.0"
    region = "us-east-1"
}

resource "aws_s3_bucket" "data" {
  bucket = "data.northernlights.vision"
  region = "us-east-1"

  website {
    index_document = "index.html"
  }

  policy = <<-POLICY
           {
             "Version": "2012-10-17",
             "Id": "Policy1566160978795",
             "Statement": [
                 {
                     "Sid": "Stmt1566160973362",
                     "Effect": "Allow",
                     "Principal": "*",
                     "Action": "s3:GetObject",
                     "Resource": "arn:aws:s3:::data.northernlights.vision/unlabelled/*"
                 },
                 {
                     "Sid": "Stmt1566274943564",
                     "Effect": "Allow",
                     "Principal": "*",
                     "Action": "s3:GetObject",
                     "Resource": "arn:aws:s3:::data.northernlights.vision/index.html"
                 },
                 {
                     "Sid": "Stmt1566274943564",
                     "Effect": "Allow",
                     "Principal": "*",
                     "Action": "s3:GetObject",
                     "Resource": "arn:aws:s3:::data.northernlights.vision/annotations/*"
                 }
             ]
           }
           POLICY

  cors_rule {
    allowed_origins = ["*"]
    allowed_methods = ["GET"]
    allowed_headers = ["*"]
  }
}

resource "aws_s3_bucket_public_access_block" "data" {
  bucket = "${aws_s3_bucket.data.id}"
  block_public_acls = true
  ignore_public_acls = true
  block_public_policy = false
}

resource "aws_s3_bucket" "labeller" {
  bucket = "labeller.northernlights.vision"
  region = "us-east-1"

  website {
    index_document = "index.html"
  }

  policy = <<-POLICY
           {
             "Version": "2012-10-17",
             "Id": "Policy1566271355793",
             "Statement": [
               {
                   "Sid": "Stmt1566271354288",
                   "Effect": "Allow",
                   "Principal": "*",
                   "Action": "s3:GetObject",
                   "Resource": "arn:aws:s3:::labeller.northernlights.vision/*"
               }
             ]
           }
           POLICY
}

resource "aws_s3_bucket_public_access_block" "labeller" {
  bucket = "${aws_s3_bucket.labeller.id}"
  block_public_acls = true
  ignore_public_acls = true
  block_public_policy = false
}
