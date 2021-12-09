# pylint: skip-file
import cv2
import numpy as np
import math

def segment_image_v2(img, img_height=1024, img_width=512, min_contour_area=1200):
    if img is None:
        print("Image is null")
        return []
    height, width, channels = img.shape
    start_height = int(height - height*.7)
    end_height = int(height*.75)
    img = img[start_height:end_height, :]
    
    img = cv2.resize(img, (img_height, img_width))
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # denoise
    gray = cv2.fastNlMeansDenoising(gray, h=5, templateWindowSize=7, searchWindowSize=21)
    
    if img is None:
        print("Image is null")
        return [] 
    
    # apply thresholding
    thresh = adaptive_threshold_image_v2(gray)
    
    # apply erosion & diliation
    kernel = np.ones((3,11), np.uint8)
#    dilated = dilate_image_v2(thresh, kernel)
#    eroded = erosion_image_v2(dilated, kernel)
    
    # find contours on image & draw bounding box
    rgb, contours = find_contours_image_v2(thresh, rgb, min_contour_area)
    segments = segment_using_contours_v2(img, contours)
    return segments

def segment_line_v2(img, img_height=1024, img_width=512, min_contour_area=4096):
    if img is None:
        print("Image is null")
        return []
    
    img = cv2.resize(img, (img_height, img_width))
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # denoise
    gray = cv2.fastNlMeansDenoising(gray, h=5, templateWindowSize=7, searchWindowSize=21)
    
    # apply thresholding
    thresh = adaptive_threshold_line_v2(gray)
    
    # apply erosion & diliation
    kernel = np.ones((11,3), np.uint8)
#    dilated = dilate_image_v2(thresh, kernel)
    eroded = erosion_image_v2(thresh, kernel)
    
     # find contours on image & draw bounding box
    rgb, contours = find_contours_image_v2(thresh, rgb, min_contour_area, sort_top_to_bottom=False)
    segments = segment_using_contours_v2(img, contours)
    return segments

def adaptive_threshold_image_v2(img):
#    print("Image after thresholding:")
    thresh = cv2.adaptiveThreshold(img, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 51, 7)
    return thresh

def adaptive_threshold_line_v2(img):
    thresh = cv2.adaptiveThreshold(img, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 21, 3)
    return thresh

def dilate_image_v2(img, kernel):
    dilated = cv2.dilate(img, kernel, iterations=1)
    print("Image after diliation:")
    return dilated

def erosion_image_v2(img, kernel):
    eroded = cv2.erode(img, kernel, iterations=3)
    return eroded

def filter_contours_image_v2(img, contours, hierarchy, min_area):
    print("Filter Contours Image")
    filtered_contours = []
    points = []
    lines = []
    if hierarchy is None:
        return img, []
    
    hierarchy = hierarchy[0] # get the actual inner list of hierarchy descriptions
   
    # filter contours based on size of contour
    # mark the range for different pixl height positions
    for i, contour in enumerate(contours):
        area = cv2.contourArea(contour)
        x,y,w,h = cv2.boundingRect(contour)
        current_hierarchy = hierarchy[i]
        
        # if contour area is too small then 
        if area < min_area:
            continue
        if np.any(current_hierarchy[3] > 0):
            continue
        
        points.append([x, y])
        if(len(lines) <= 0):
            lines.append(y)
        
        not_in_lines = True
        
        for line in lines:
            pixel_height_difference = math.fabs(y - line)
            if pixel_height_difference < 10:
                not_in_lines = False
                break
        
        if not_in_lines is True:
            lines.append(y)
                
        filtered_contours.append(contour)
        cv2.rectangle(img,(x,y),(x+w,y+h),(255,0,0),2)
    points = sorted(points , key=lambda k: [k[1], k[0]])
    lines = sorted(lines , key=lambda k: (k))
    
    sorted_filtered_contours = []
    for i in range(len(lines)):
        sorted_filtered_contours.append([])
    
    # filter contours based 
    for i, contour in enumerate(contours):
        x,y,w,h = cv2.boundingRect(contour)
        point = [x, y]
        if point in points:
            for j in range(len(lines)):
                
                pixel_height_difference = math.fabs(y - lines[j])
                if pixel_height_difference < 10:
                    sfc_list = list(sorted_filtered_contours[j])
                    sfc_list.append(point)
                    sorted_filtered_contours[j] = np.asarray(sfc_list)
                    break
                    
    sorted_points = []        
    for i in range(len(sorted_filtered_contours)):
        sorted_filtered_contours[i] = sorted(sorted_filtered_contours[i] , key=lambda k: (k[0]))
        for j in range(len(sorted_filtered_contours[i])):
            sorted_points.append(sorted_filtered_contours[i][j])

    for i, contour in enumerate(contours):
        x,y,w,h = cv2.boundingRect(contour)
        point = [x, y]
        for j in range(len(sorted_points)):
            sorted_point = list(sorted_points[j])
            if j >= (len(filtered_contours)):
                continue
            if (x == sorted_point[0]) and (y == sorted_point[1]):
                filtered_contours[j] = contour
            
    return img, filtered_contours

def find_contours_image_v2(img, rgb, min_area, sort_top_to_bottom=True):
    image2, contours, hierarchy = cv2.findContours(img.copy(), cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(img, contours, -1, (0,255,0), 4)
    if contours is None:
        return img, []

    rgb, contours = filter_contours_image_v2(rgb, contours, hierarchy, min_area)
    if len(contours) <= 0:
        return img, []
    
    return img, contours

def segment_using_contours_v2(img, contours):
    segments = []
    for contour in contours:
        x,y,w,h = cv2.boundingRect(contour)
        segment = img[y:y+h, x:x+w]
        segments.append(segment)   
    return segments
