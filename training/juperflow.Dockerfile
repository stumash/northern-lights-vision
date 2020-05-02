FROM tensorflow/tensorflow:nightly-gpu-py3-jupyter

COPY ./requirements.txt /tf

RUN pip install -r requirements.txt
