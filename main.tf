provider "aws" {
    version = "~> 2.0"
    region = "us-east-1"
}

resource "aws_s3_bucket" "data" {
  bucket = "data.northernlights.vision"
  region = "us-east-1"
  acl = "private"
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
