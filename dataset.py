# pylint: skip-file
import os
from collections import Counter
import string
import random
import cv2
import numpy as np

class Dataset(object):
    def __init__(self, img_height, img_width, classes):
        self.img_height = img_height
        self.img_width = img_width
        self.classes = classes
        self.num_classes = len(classes)
        
        self.imgs_gray = []
        self.imgs_rgb = []
        self.labels = []
        self.n = 0
        self.indexes = []
        self.current_index = 0
        return
    
    def build_data_from_directory(self, root_directory):
        imgs_gray = []
        imgs_rgb = []
        labels = []
        n = 0
        
        # samples for each class is in a subdirectory
        # First 10 Subdirectories: 0-9
        # Next 26 Subdirectoreis: A-Z
        # Last 26 Subdirectoreis: a-z
        for label_directory in os.listdir(root_directory):
            label = label_directory[len(label_directory)-2:]
            label = int(label) - 1
            directory = root_directory + '/' + label_directory
            
            # samples for each label class
            for filename in os.listdir(directory):
                filepath = directory + '/' + filename
                gray, rgb, img = self.get_img(filepath)
                if gray is None:
                    continue
                
#                self.print_sample(filename, label, rgb, gray, img)
                imgs_gray.append(gray)
                imgs_rgb.append(rgb)
                labels.append(label)
                n = n + 1
        self.imgs_gray.extend(imgs_gray)
        self.imgs_rgb.extend(imgs_rgb)
        self.labels.extend(labels)
        self.n = self.n + n
        self.indexes = list(range(self.n))
        random.shuffle(self.indexes)
        self.current_index = 0
        return
    
    def clear(self):
        self.imgs_gray = []
        self.imgs_rgb = []
        self.labels = []
        self.n = 0
        self.indexes = []
        self.current_index = 0
        return
        
    def get_img(self, file):
        img = cv2.imread(file)
        if img is None:
            print("Image at " + file + " cannot be opened")
            return None, None
             
        img_resize = cv2.resize(img, (self.img_width, self.img_height), interpolation = cv2.INTER_AREA)
               
        # grayscale image is the input into network
        gray = cv2.cvtColor(img_resize, cv2.COLOR_BGR2GRAY)
        rgb = cv2.cvtColor(img_resize, cv2.COLOR_BGR2RGB)
        gray = gray.astype(np.float32)
        gray /= 255
        return gray, rgb, img
    
    def print_sample(self, filename, label, rgb, gray, img):
        # print data
        print("Filepath: " + filename)
        print("Label: " + self.classes[label])
        
        print("Original:")
        plt.imshow(rgb)
        plt.axis("off")
        plt.show()                          
        
        print("Grayscale:")
        plt.imshow(gray, cmap='gray')
        plt.axis("off")
        plt.show()
        return
    
    def next_sample(self):
        self.current_index = self.current_index + 1
        if self.current_index >= self.n:
            print("Shuffle Indexes")
            self.current_index = 0
            random.shuffle(self.indexes)
            
        sample_index = self.indexes[self.current_index]
        return self.imgs_gray[sample_index], self.imgs_rgb[sample_index], self.labels[sample_index]
    
    def next_batch(self, batch_size):
        X = []
        Y = []
        imgs_rgb= []
        for i in range(batch_size):
            x, rgb, y = self.next_sample()
            y_one_hot = np.zeros(self.num_classes)
            y_one_hot[y] = 1
            x = np.reshape(x, (x.shape[0], x.shape[1], 1))
            X.append(x)
            Y.append(y_one_hot)
            
        X = np.asarray(X, dtype=np.float32)
        imgs_rgb = np.asarray(imgs_rgb, dtype=np.float32)
        Y = np.asarray(Y, dtype=np.float32)
        Y = np.reshape(Y, (Y.shape[0], self.num_classes))
        return X, imgs_rgb, Y