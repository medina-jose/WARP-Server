# pylint: skip-file
import sys
import segmentation_v2 as s
import network
import dataset as D
import cv2
from PIL import Image
import base64 
import io
import numpy as np
import os
current_directory = os.path.dirname(os.path.realpath(__file__))
current_directory = current_directory.replace('\\','/')

def ocr(img, img_height, img_width):
    words = []

    # 1st: segment images containing word(s) from image
    # 2nd: segment images containing single characters from word(s)
    lines = s.segment_image_v2(img, img_width, img_height)
    # print("Segmenting Label")
    for line in lines:
        line_letters = s.segment_line_v2(line, img_width, img_height)
        if line_letters is None:
            continue
        words.append(line_letters)

    # get output from character cnn
    cnn_words = network.test(words);
    return cnn_words

# test python ocr
# rotating image is not necessary for test 
# because it is stored right side up
def test():
    img_width = 1024
    img_height = 512
    file = current_directory + "/img/therollingstones_tattooyou.jpg"
    img = cv2.imread(file)

    if img is None:
        # print("Saved image file could not be opened")
        query = '{"query": "", "error": "Saved image file could not be opened"}'
    else:
        cnn_words = ocr(img, img_height, img_width)
        query = '{"query": "' + cnn_words + '", "error": ""}'
    return query

query = test()
# print(query)
sys.stdout.write(query)
sys.stdout.flush() 
   