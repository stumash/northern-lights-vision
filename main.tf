provider "aws" {
    version
    region = "us-east-2"
}

resource "aws_s3_bucket" "b" {
  bucket = "data.northernlights.vision"

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
}
