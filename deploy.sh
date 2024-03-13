#!/bin/bash

# The name of the Docker image
DOCKER_IMAGE_NAME="<your-docker-image-name>"

# The name for the Docker container
CONTAINER_NAME="<your-container-name>"

# EC2 details
EC2_PUBLIC_DNS="ec2-3-109-203-243.ap-south-1.compute.amazonaws.com"
PEM_FILE="./brain_key.pem"

# Build the Docker image
docker build -t $DOCKER_IMAGE_NAME .

# Save the Docker image as a tar file
docker save $DOCKER_IMAGE_NAME | gzip > ${DOCKER_IMAGE_NAME}.tar.gz

# Copy the Docker image to the EC2 instance
scp -i $PEM_FILE ${DOCKER_IMAGE_NAME}.tar.gz ec2-user@$EC2_PUBLIC_DNS:~

# SSH into the EC2 instance, load the Docker image, and run it
ssh -i $PEM_FILE ec2-user@$EC2_PUBLIC_DNS << EOF
  # Load the Docker image
  docker load < ${DOCKER_IMAGE_NAME}.tar.gz

  # Stop the existing container (if any)
  docker stop $CONTAINER_NAME || true && docker rm $CONTAINER_NAME || true

  # Run the Docker container
  docker run -d --name $CONTAINER_NAME -p 80:3000 $DOCKER_IMAGE_NAME
EOF

# Clean up the local tar.gz file
rm ${DOCKER_IMAGE_NAME}.tar.gz

echo "Deployment completed."
