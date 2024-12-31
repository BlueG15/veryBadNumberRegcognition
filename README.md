# A very very bad hand written number recognition program
Background:
I tried applying kd-tree find nearest neighbor to a traditionally machine learning problem. Heavy emphasis on try




Pros:
+ No machine learning
+ Fully deterministic.
+ Small sized!!. "Trained" only on 200MB of data (30k images of each number).
+ Super fast after the loading period.



Cons:
+  You can feel the biases in the data set, i.e a number has to be draw a certain way for it to recognize.
+  It does NOT perform well at all.
+  Super slow loading time, give it a solid 30 seconds or s.th, its faster on local

Technical data:
Input is 3 images, the original, centered and rescaled, plus 2 more with colored in spot on the top right and bottom right respectively (why? idk, in practice it performs better if we add the dots there).
The input is then ran through get nearest neighbor algorithms with a very wonky distance function am not discussing here.
The output is then further judged using 40 different metrics. Score then counted based on these metrics.

Data set credit: https://www.kaggle.com/datasets/vaibhao/handwritten-characters
