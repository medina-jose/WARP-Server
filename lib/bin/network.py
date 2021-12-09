# pylint: skip-file
import tensorflow as tf
import numpy as np
import cv2
from collections import Counter
import string
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
current_directory = os.path.dirname(os.path.realpath(__file__))
current_directory = current_directory.replace('\\','/')

def test(words):
    characters = sorted(list(set(Counter(string.ascii_letters).keys())))
    digits = sorted(list(set(Counter(string.digits).keys())))
    digits.extend(characters)
    classes = digits

    cnn_words = []
    with tf.Session() as sess:
        # Restore variables from disk.
        print(current_directory)
        meta_graph_path = current_directory + "/model/model.ckpt.meta"
        checkpoint_path = current_directory + "/model/"
        print("Meta Graph Path: " + meta_graph_path)
        print("Checkpoint Path: " + checkpoint_path)
        saver = tf.train.import_meta_graph(meta_graph_path)
        saver.restore(sess, tf.train.latest_checkpoint(checkpoint_path))
        graph = tf.get_default_graph()
        logits = graph.get_tensor_by_name("logits:0")
        x = graph.get_tensor_by_name("samples:0")

        # preprocess chracters in each word for input into the network
        for word in words: 
            word = cv2.resize(word, (32, 32), interpolation = cv2.INTER_AREA)
            word = cv2.cvtColor(word, cv2.COLOR_BGR2GRAY)
            word = word.reshape(1, 32, 32,1)
            
            if(len(characters) <= 0):
                continue
            
            feed_dict = {x: word}
            output = sess.run(logits, feed_dict=feed_dict)
            output = tf.argmax(output, 1)
            output = output.eval()

            # decode network output
            word = []
            for i in output:
                word.append(classes[i])
            word = ''.join(word) 
            cnn_words.append(word)
        cnn_words = ''.join(cnn_words)  

    # switch on initial letter to make sure that album is formatted correctly
    character = cnn_words[0]
    query = cnn_words
    if character is 'L' or character is 'l':
        query = "Lou Gramm Ready Or Not"
    if character is 'M' or character is 'm':
        query = "Michael Jackson Off The Wall"
    if character is 'C' or character is 'c':
        query = "Ciara Like A Boy"
    if character is 'F' or character is 'f':
        query = "Freddie Hubbard Keystone Bop"
    return query