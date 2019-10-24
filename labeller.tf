provider "aws" {
  version = "~> 2.0"
  region = "us-east-1"
}

terraform {
  backend "s3" {
    bucket = "tfstate-s3-northernlights-vision"
    key = "prod/terraform.tfstate"
    dynamodb_table = "tfstate-dynamodb-northernlights-vision"
    region = "us-east-1"
  }
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
  bucket = "${aws_s3_bucket.data.bucket}"
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
  bucket = "${aws_s3_bucket.labeller.bucket}"
  block_public_acls = true
  ignore_public_acls = true
  block_public_policy = false
}

resource "aws_lambda_function" "api_labeller" {
  function_name = "api_labeller"
  role = "${aws_iam_role.api_labeller_role.arn}"

  runtime = "nodejs10.x"
  handler = "lambda.handler"  

  timeout = 10
  memory_size = 512
}

resource "aws_iam_role" "api_labeller_role" {
  name = "api_labeller_role"
  description = "Allows Lambda functions to call S3 on your behalf."

  assume_role_policy = <<-EOF
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": "sts:AssumeRole",
        "Principal": {
          "Service": "lambda.amazonaws.com"
        },
        "Effect": "Allow",
        "Sid": ""
      }
    ]
  }
  EOF
}

resource "aws_iam_role_policy_attachment" "api_labeller_role_s3fullaccess" {
  role       = "${aws_iam_role.api_labeller_role.name}"
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}

resource "aws_iam_role_policy_attachment" "api_labeller_role_lambdabasicexecution" {
  role       = "${aws_iam_role.api_labeller_role.name}"
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_api_gateway_rest_api" "api_labeller_northernlights_vision" {
  name = "api_labeller_northernlights_vision"
  body = <<-EOF
  {
    "openapi": "3.0.1",
    "info": {
      "title": "api_labeller_northernlights_vision",
      "version": "2019-08-31T02:31:41Z"
    },
    "servers": [
      {
        "url": "https://api.labeller.northernlights.vision"
      }
    ],
    "paths": {
      "/{api-labeller-lambda+}": {
        "options": {
          "responses": {
            "200": {
              "description": "200 response",
              "headers": {
                "Access-Control-Allow-Origin": {
                  "schema": {
                    "type": "string"
                  }
                },
                "Access-Control-Allow-Methods": {
                  "schema": {
                    "type": "string"
                  }
                },
                "Access-Control-Allow-Headers": {
                  "schema": {
                    "type": "string"
                  }
                }
              },
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Empty"
                  }
                }
              }
            }
          }
        },
        "x-amazon-apigateway-any-method": {
          "parameters": [
            {
              "name": "api-labeller-lambda",
              "in": "path",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ]
        }
      }
    },
    "components": {
      "schemas": {
        "Empty": {
          "title": "Empty Schema",
          "type": "object"
        }
      }
    }
  }
  EOF
}

locals {
  domain_name = "northernlights.vision"
  data_domain_name = "data.${local.domain_name}"
  labeller_domain_name = "labeller.${local.domain_name}"
  api_labeller_domain_name = "api.${local.labeller_domain_name}"
}

resource "aws_route53_zone" "northernlights_vision" {
  name = "${local.domain_name}"
}

resource "aws_api_gateway_domain_name" "api_labeller_northernlights_vision" {
  certificate_arn = "arn:aws:acm:us-east-1:171337445867:certificate/33590e53-4953-4e9f-960c-a4e8c1a87ae4"
  domain_name     = "${local.api_labeller_domain_name}"
}

resource "aws_route53_record" "api_labeller_northernlights_vision" {
  name    = "${local.api_labeller_domain_name}"
  type    = "A"
  zone_id = "${aws_route53_zone.northernlights_vision.id}"

  alias {
    evaluate_target_health = false
    name                   = "${aws_api_gateway_domain_name.api_labeller_northernlights_vision.cloudfront_domain_name}"
    zone_id                = "${aws_api_gateway_domain_name.api_labeller_northernlights_vision.cloudfront_zone_id}"
  }
}

resource "aws_route53_record" "data_northernlights_vision" {
  name = "${local.data_domain_name}"
  type = "A"
  zone_id = "${aws_route53_zone.northernlights_vision.id}"

  alias {
    evaluate_target_health = false
    name                   = "${aws_s3_bucket.data.website_domain}"
    zone_id                = "${aws_s3_bucket.data.hosted_zone_id}"
  }
}

# resource "aws_route53_record" "northernlights_vision_NS" {
#   zone_id = "${aws_route53_zone.northernlights_vision.zone_id}"
#   name = "${aws_route53_zone.northernlights_vision.name}"
#   type = "NS"
#   ttl = 172800

#   records = [
#     "${aws_route53_zone.northernlights_vision.name_servers.0}",
#     "${aws_route53_zone.northernlights_vision.name_servers.1}",
#     "${aws_route53_zone.northernlights_vision.name_servers.2}",
#     "${aws_route53_zone.northernlights_vision.name_servers.3}",
#   ]
# }

# resource "aws_route53_record" "northernlights_vision_SOA" {
#   zone_id = "${aws_route53_zone.northernlights_vision.zone_id}"
#   name = "${aws_route53_zone.northernlights_vision.name}"
#   type = "SOA"
#   ttl = 900
# }

#resource "aws_route53_zone" "api_northernlights_vision" {
  #name = "api.${aws_route53_zone.northernlights_vision.name}"
#}

#resource "aws_route53_zone" "data_northernlights_vision" {
  #name = "data.${aws_route53_zone.northernlights_vision.name}"
#}

#resource "aws_route53_zone" "labeller_northernlights_vision" {
  #name = "labeller.${aws_route53_zone.northernlights_vision.name}"
#}

