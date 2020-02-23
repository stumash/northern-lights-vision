FROM tensorflow/tensorflow:nightly-py3-jupyter

COPY ./requirements.txt /tf

RUN pip install -r requirements.txt